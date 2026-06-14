#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Deploy a local SQLite database file to the Azure App Service persistent volume.

.DESCRIPTION
  DESTRUCTIVE: this REPLACES the live production database at $RemoteDir/$DbName
  (default /home/data/spa.db) with the local $File. All existing users and
  bookings on the server are lost. You must pass -Force to proceed.

  Typical use — ship a clean, empty database with the latest schema:

      npm run db:init           # writes ./spa.db (empty, latest schema)
      npm run deploy-db -- -Force

  Flow: stop the app → delete any stale -wal/-shm sidecars via the Kudu VFS API
  (a leftover WAL would be replayed into the new file on next open, corrupting
  it; OneDeploy rejects zero-byte uploads so they can't just be overwritten) →
  upload the DB → start the app → poll until the site serves 200. On the next
  boot the app recreates any missing schema and reseeds reference content
  (services, availability, holidays, settings) since the tables are empty.

  Auth mirrors deploy-azure.ps1: it runs `az login` if needed (add -DeviceCode on
  a headless machine; -Tenant <id> if the subscription's tenant enforces MFA).
#>
[CmdletBinding()]
param(
  [string]$File          = 'spa.db',                                   # local DB file to upload
  [switch]$Force,                                                       # required — guards the prod overwrite
  [switch]$DeviceCode,                                                  # az login --use-device-code (headless)
  [string]$Tenant        = '902f14f8-6c86-4d31-9e56-c3715eeca530',
  [string]$App           = 'thai-headspa-ajaccio',
  [string]$ResourceGroup = 'rg-thai-headspa',
  [string]$Subscription  = 'efab821f-1294-49d7-936a-a08350e886f4',
  [string]$RemoteDir     = '/home/data',                               # must match DATABASE_PATH's dir
  [string]$DbName        = 'spa.db',
  [int]$HealthTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$BaseUrl = "https://$App.azurewebsites.net"
# Kudu's VFS API roots at /home on Linux App Service.
$VfsBase = "https://$App.scm.azurewebsites.net/api/vfs/" + (($RemoteDir -replace '^/home/?', '').TrimEnd('/'))

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# Stop local Node.js processes (the dev server, stray tooling) that hold the
# SQLite file open or keep appending to its WAL. Never touches THIS script's own
# process tree (the npm/pwsh that launched it), or we'd kill the deploy mid-run.
function Stop-LocalNode {
  $protected = [System.Collections.Generic.HashSet[int]]::new()
  $cursor = $PID
  while ($cursor -and $protected.Add([int]$cursor)) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $cursor" -ErrorAction SilentlyContinue
    $cursor = [int]($p.ParentProcessId)
  }
  $node = @(Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { -not $protected.Contains([int]$_.Id) })
  if ($node.Count -gt 0) {
    Write-Host "  Stopping $($node.Count) Node process(es) [PID: $($node.Id -join ', ')] so the local DB is quiescent..."
    $node | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  } else {
    Write-Host '  No stray Node processes holding the local database.'
  }
}

# Flush the dev server's write-ahead log into the main .db file. This script
# uploads ONLY the main file (and deletes the remote WAL), so committed writes
# still stranded in <db>-wal would otherwise never reach the server. TRUNCATE
# also clears the sidecar once the frames are merged in.
function Invoke-WalCheckpoint($DbFile) {
  if (-not (Test-Path $DbFile)) { return }
  $wal = "$DbFile-wal"
  if (Test-Path $wal) {
    Write-Host ("  WAL sidecar present ({0:N1} KB) — checkpointing into $DbFile..." -f ((Get-Item $wal).Length / 1KB))
  } else {
    Write-Host "  No WAL sidecar — $DbFile is already consolidated."
  }
  node -e "const D=require('better-sqlite3');const db=new D(process.argv[1]);db.pragma('journal_mode = WAL');const r=db.pragma('wal_checkpoint(TRUNCATE)');db.close();console.log('  checkpoint:',JSON.stringify(r[0]??r));" "$DbFile"
  if ($LASTEXITCODE -ne 0) { throw "WAL checkpoint failed for $DbFile (exit $LASTEXITCODE). Is a Node process still locking it?" }
}

function Invoke-AzLogin {
  # The ARM scope matters: the Kudu VFS API is called with a bearer token for
  # that audience, and an MFA-enforcing tenant only issues it during an
  # interactive login that requested it.
  $loginArgs = @('login', '--only-show-errors', '--scope', 'https://management.azure.com//.default')
  if ($Tenant)     { $loginArgs += @('--tenant', $Tenant) }
  if ($DeviceCode) { $loginArgs += '--use-device-code' }
  Write-Host ("Launching az login{0}..." -f $(if ($Tenant) { " (tenant $Tenant)" } else { '' })) -ForegroundColor Yellow
  az @loginArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "az login failed. If the tenant enforces MFA, re-run with -Tenant <id>; on a machine without a browser add -DeviceCode."
  }
}

function Get-ArmAccessToken {
  $t = az account get-access-token --resource 'https://management.azure.com/' --query accessToken -o tsv 2>$null
  if ($LASTEXITCODE -eq 0 -and $t) { return $t }
  return $null
}

# Bearer-token header for the Kudu (SCM) site — basic publishing credentials
# are disabled by default on newer App Service apps.
function Get-KuduAuthHeader {
  $token = Get-ArmAccessToken
  if (-not $token) {
    Write-Host 'The cached session cannot mint an ARM access token (MFA required) — re-authenticating...' -ForegroundColor Yellow
    Invoke-AzLogin
    az account set --subscription $Subscription 2>$null | Out-Null
    $token = Get-ArmAccessToken
  }
  if (-not $token) { throw 'Could not obtain an ARM access token for the Kudu API even after re-login.' }
  return @{ Authorization = "Bearer $token" }
}

# Wait until the Kudu (SCM) site responds — its container cold-starts on the
# first request. Done BEFORE the app is stopped so failures cost no downtime.
function Wait-KuduReady($Headers) {
  $deadline = (Get-Date).AddSeconds(240)
  while ((Get-Date) -lt $deadline) {
    $r = $null
    try {
      $r = Invoke-WebRequest -Uri "$VfsBase/" -Headers $Headers -TimeoutSec 30 -SkipHttpErrorCheck
    } catch {
      Write-Host "  Kudu not ready yet ($($_.Exception.Message))"
    }
    if ($r -and $r.StatusCode -eq 200) { return }
    if ($r -and $r.StatusCode -in 401, 403) {
      throw "Kudu rejected the credentials (HTTP $($r.StatusCode)). Check that your account has access to the SCM site."
    }
    if ($r) { Write-Host "  Kudu returned $($r.StatusCode) — retrying..." }
    Start-Sleep -Seconds 5
  }
  throw 'The Kudu (SCM) site did not respond within 4 minutes.'
}

# Delete one remote file via the Kudu VFS API (404 → already absent, fine).
# OneDeploy rejects zero-byte uploads (HTTP 400), so stale WAL sidecars are
# removed this way rather than overwritten with empty files.
function Remove-RemoteFile($Headers, $Name) {
  $h = @{} + $Headers
  $h['If-Match'] = '*'
  try {
    Invoke-WebRequest -Uri "$VfsBase/$Name" -Method Delete -Headers $h -TimeoutSec 60 | Out-Null
    Write-Host "  × $Name removed"
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 404) { Write-Host "  · $Name not present"; return }
    throw "Delete failed for $Name (HTTP $status): $($_.Exception.Message)"
  }
}

# Upload a single file to an absolute path on the app via OneDeploy (type=static).
function Push-File($LocalPath, $RemotePath) {
  az webapp deploy -n $App -g $ResourceGroup `
    --src-path $LocalPath --type static --target-path $RemotePath `
    --track-status false | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Upload failed for $RemotePath (exit $LASTEXITCODE)." }
  Write-Host "  → $RemotePath"
}

function Test-Healthy {
  $deadline = (Get-Date).AddSeconds($HealthTimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $BaseUrl -Method Get -TimeoutSec 15 -SkipHttpErrorCheck
      if ($r.StatusCode -eq 200) { return $true }
      Write-Host "  $($r.StatusCode) — waiting for container restart..."
    } catch {
      Write-Host "  not ready yet ($($_.Exception.Message))"
    }
    Start-Sleep -Seconds 10
  }
  return $false
}

# --- main --------------------------------------------------------------------

$appStopped = $false
try {
  Step 'Preflight'
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI 'az' not found on PATH. Install it and run 'az login'."
  }
  if (-not (Test-Path $File)) {
    throw "Local database file not found: $File. Generate one first with 'npm run db:init'."
  }
  if (-not $Force) {
    throw "Refusing to overwrite the production database at $RemoteDir/$DbName. Re-run with -Force if you really mean it."
  }

  # The dev server runs SQLite in WAL mode and keeps the connection open, so the
  # main .db file can lag far behind the live state (everything sits in the WAL).
  # Stop Node and checkpoint BEFORE upload so we ship the current local data.
  Step 'Consolidating local database'
  Stop-LocalNode
  Invoke-WalCheckpoint $File

  if (-not (az account show --query id -o tsv 2>$null)) {
    Write-Host 'No active Azure session.' -ForegroundColor Yellow
    Invoke-AzLogin
    if (-not (az account show --query id -o tsv 2>$null)) { throw 'Still not authenticated after az login.' }
  }
  az account set --subscription $Subscription 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Subscription $Subscription not in current session — re-authenticating..." -ForegroundColor Yellow
    Invoke-AzLogin
    az account set --subscription $Subscription 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Subscription $Subscription is not available to this account. Try: -Tenant <tenant-id>, or 'az account list -o table'."
    }
  }
  $size = '{0:N1} KB' -f ((Get-Item $File).Length / 1KB)
  Write-Host "Account: $(az account show --query 'user.name' -o tsv)  /  $App ($ResourceGroup)"
  Write-Warning "About to REPLACE $RemoteDir/$DbName with '$File' ($size). Existing server data will be lost."

  # Warm up Kudu while the app is still running — failures here cost no downtime.
  Step 'Checking Kudu'
  $kudu = Get-KuduAuthHeader
  Wait-KuduReady $kudu

  # Stop the app so nothing holds the SQLite file open while we replace it.
  Step 'Stopping app'
  az webapp stop -n $App -g $ResourceGroup | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp stop failed (exit $LASTEXITCODE)." }
  $appStopped = $true

  Step 'Uploading database'
  # Remove the stale WAL sidecars FIRST — a leftover -wal from the previous
  # database would be replayed into the new file on the next open, corrupting
  # it. Only then replace the database file itself.
  Remove-RemoteFile $kudu "$DbName-wal"
  Remove-RemoteFile $kudu "$DbName-shm"
  Push-File $File "$RemoteDir/$DbName"

  Step 'Starting app'
  az webapp start -n $App -g $ResourceGroup | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp start failed (exit $LASTEXITCODE)." }
  $appStopped = $false

  Step 'Verifying live site'
  if (Test-Healthy) {
    Write-Host ("`nDatabase deployed; site healthy in {0:m\:ss}: $BaseUrl" -f $sw.Elapsed) -ForegroundColor Green
  } else {
    throw "Site did not return 200 within $HealthTimeoutSec s. Check: $BaseUrl"
  }
}
finally {
  if ($appStopped) {
    Write-Warning 'Restarting the app after an error...'
    az webapp start -n $App -g $ResourceGroup | Out-Null
  }
}

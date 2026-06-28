#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Apply schema migrations + new seed data to the LIVE Azure database, preserving
  all existing users and bookings.

.DESCRIPTION
  NON-DESTRUCTIVE counterpart to deploy-db.ps1 (which replaces the database).
  Flow:

    stop app → download /home/data/spa.db (+ WAL sidecars) via the Kudu VFS API
    → keep a timestamped backup under ./backups/ → run scripts/migrate-db.ts on
    a working copy (creates missing tables/columns, seeds missing reference
    rows — same idempotent initializer the app runs at boot) → upload the
    migrated file back (+ empty -wal/-shm to clobber stale sidecars) → start
    app → poll until the site serves 200.

  The app is stopped during the whole operation (typically 1–2 min) so the
  SQLite file cannot change between download and re-upload.

  NOTE: deploying new app code (npm run deploy-azure) also applies these
  migrations automatically on boot. Use this script when you want to migrate
  the database explicitly, with a backup, without shipping code — or use
  -BackupOnly to just pull a consistent snapshot of the production database.

  Typical use:

      npm run deploy-db:migrate -- -Force        # backup + migrate + re-upload
      npm run deploy-db:migrate -- -BackupOnly   # backup only, nothing changed

  Auth mirrors deploy-azure.ps1: runs `az login` if needed (add -DeviceCode on
  a headless machine; -Tenant <id> if the subscription's tenant enforces MFA).
#>
[CmdletBinding()]
param(
  [switch]$Force,                                                       # required to modify the live DB
  [switch]$BackupOnly,                                                  # download a consistent snapshot, change nothing
  [switch]$DeviceCode,                                                  # az login --use-device-code (headless)
  [string]$Tenant        = '902f14f8-6c86-4d31-9e56-c3715eeca530',
  [string]$App           = 'thai-headspa-ajaccio',
  [string]$ResourceGroup = 'rg-thai-headspa',
  [string]$Subscription  = 'efab821f-1294-49d7-936a-a08350e886f4',
  [string]$RemoteDir     = '/home/data',                               # must match DATABASE_PATH's dir
  [string]$DbName        = 'spa.db',
  [string]$BackupDir     = 'backups',
  [int]$HealthTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$BaseUrl = "https://$App.azurewebsites.net"
# Kudu's VFS API roots at /home on Linux App Service.
$VfsBase = "https://$App.scm.azurewebsites.net/api/vfs/" + (($RemoteDir -replace '^/home/?', '').TrimEnd('/'))

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# Stop local Node.js processes (the dev server, stray tooling) so nothing on this
# machine is writing while we operate. Never touches THIS script's own process
# tree (the npm/pwsh that launched it), or we'd kill the migration mid-run.
# (The DB this script migrates is the one downloaded from Azure — migrate-db.ts
# checkpoints that copy — so there is no local file to consolidate here.)
function Stop-LocalNode {
  $protected = [System.Collections.Generic.HashSet[int]]::new()
  $cursor = $PID
  while ($cursor -and $protected.Add([int]$cursor)) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $cursor" -ErrorAction SilentlyContinue
    $cursor = [int]($p.ParentProcessId)
  }
  $node = @(Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { -not $protected.Contains([int]$_.Id) })
  if ($node.Count -gt 0) {
    Write-Host "  Stopping $($node.Count) Node process(es) [PID: $($node.Id -join ', ')]..."
    $node | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  } else {
    Write-Host '  No stray Node processes running.'
  }
}

function Invoke-AzLogin {
  # The ARM scope matters: the Kudu API is called with a bearer token for that
  # audience, and an MFA-enforcing tenant only issues it during an interactive
  # login that requested it.
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

# Auth header for the Kudu (SCM) site: an AAD bearer token for the ARM
# audience. Basic publishing credentials are disabled by default on newer App
# Service apps, so a bearer token is the only reliable path. If the cached
# session can't mint one non-interactively (MFA-enforcing tenant → AADSTS50076),
# re-authenticate interactively with the ARM scope and retry.
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

# Wait until the Kudu (SCM) site responds, and return the remote dir listing.
# The SCM container cold-starts on its first request (which can exceed any
# single request timeout), so this both warms it up and validates the token
# and path — all BEFORE the app is stopped, keeping failures downtime-free.
function Wait-KuduReady($Headers) {
  $deadline = (Get-Date).AddSeconds(240)
  while ((Get-Date) -lt $deadline) {
    $r = $null
    try {
      $r = Invoke-WebRequest -Uri "$VfsBase/" -Headers $Headers -TimeoutSec 30 -SkipHttpErrorCheck
    } catch {
      Write-Host "  Kudu not ready yet ($($_.Exception.Message))"
    }
    if ($r -and $r.StatusCode -eq 200) { return ($r.Content | ConvertFrom-Json) }
    if ($r -and $r.StatusCode -in 401, 403) {
      throw "Kudu rejected the credentials (HTTP $($r.StatusCode)). Check that your account has access to the SCM site."
    }
    if ($r) { Write-Host "  Kudu returned $($r.StatusCode) — retrying..." }
    Start-Sleep -Seconds 5
  }
  throw 'The Kudu (SCM) site did not respond within 4 minutes.'
}

# Download one remote file; returns $true if it existed (404 → $false).
# Retries transient failures — the SCM container can still be slow right
# after the main app is stopped.
function Get-RemoteFile($Headers, $Name, $LocalPath) {
  $attempts = 4
  for ($i = 1; $i -le $attempts; $i++) {
    try {
      Invoke-WebRequest -Uri "$VfsBase/$Name" -Headers $Headers -OutFile $LocalPath -TimeoutSec 180 | Out-Null
      Write-Host ("  ← {0} ({1:N1} KB)" -f $Name, ((Get-Item $LocalPath).Length / 1KB))
      return $true
    } catch {
      $status = $_.Exception.Response.StatusCode.value__
      if ($status -eq 404) { return $false }
      if ($status -in 401, 403) { throw "Download failed for $Name (HTTP $status): the Kudu site rejected the credentials." }
      if ($i -lt $attempts) {
        Write-Host "  attempt $i/$attempts failed for $Name ($($_.Exception.Message)) — retrying in 10 s..."
        Start-Sleep -Seconds 10
      } else {
        throw "Download failed for $Name after $attempts attempts: $($_.Exception.Message)"
      }
    }
  }
}

# Upload a single file to an absolute /home/... path via the Kudu VFS API (PUT).
# PowerShell's HTTP stack uses the Windows certificate store, so this works behind
# a TLS-intercepting corporate proxy that breaks az (Python/requests: SSL
# CERTIFICATE_VERIFY_FAILED) — the same stack already used here for download/delete.
function Push-File($Headers, $LocalPath, $RemotePath) {
  $rel = ($RemotePath -replace '^/home/?', '').TrimEnd('/')
  $uri = "https://$App.scm.azurewebsites.net/api/vfs/$rel"
  $h = @{} + $Headers
  $h['If-Match'] = '*'   # overwrite unconditionally
  Invoke-WebRequest -Uri $uri -Method Put -Headers $h -InFile $LocalPath -ContentType 'application/octet-stream' -TimeoutSec 300 | Out-Null
  Write-Host "  → $RemotePath"
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
  if (-not $Force -and -not $BackupOnly) {
    throw "This migrates the production database in place (a backup is kept under ./$BackupDir). Re-run with -Force to proceed, or -BackupOnly to only download a snapshot."
  }

  # Quiesce the local machine (no dev server writing) for a clean run.
  Step 'Stopping local Node'
  Stop-LocalNode

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
  Write-Host "Account: $(az account show --query 'user.name' -o tsv)  /  $App ($ResourceGroup)  [mode: $(if ($BackupOnly) {'backup-only'} else {'migrate'})]"
  $kudu = Get-KuduAuthHeader

  # Warm up Kudu and confirm the database exists — all while the app is still
  # running, so any failure here costs no downtime.
  Step 'Checking Kudu & remote database'
  $listing = Wait-KuduReady $kudu
  $remoteDb = $listing | Where-Object { $_.name -eq $DbName }
  if (-not $remoteDb) {
    throw "No database named $DbName found in $RemoteDir on the server (found: $(($listing | ForEach-Object name) -join ', '))."
  }
  Write-Host ("  Found {0} ({1:N1} KB) on the server" -f $DbName, ($remoteDb.size / 1KB))

  # Stop the app so the SQLite file (and its WAL) is quiescent and cannot
  # change between download and re-upload.
  Step 'Stopping app'
  az webapp stop -n $App -g $ResourceGroup | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp stop failed (exit $LASTEXITCODE)." }
  $appStopped = $true

  Step 'Downloading live database'
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $snapDir = Join-Path $BackupDir "$App-$stamp"
  New-Item -ItemType Directory -Force $snapDir | Out-Null
  if (-not (Get-RemoteFile $kudu $DbName (Join-Path $snapDir $DbName))) {
    throw "No database found at $RemoteDir/$DbName on the server."
  }
  # WAL sidecars carry not-yet-checkpointed writes — fetch them if present so
  # the local copy opens to the exact live state.
  Get-RemoteFile $kudu "$DbName-wal" (Join-Path $snapDir "$DbName-wal") | Out-Null
  Get-RemoteFile $kudu "$DbName-shm" (Join-Path $snapDir "$DbName-shm") | Out-Null
  Write-Host "Backup kept at $snapDir"

  if ($BackupOnly) {
    Step 'Starting app'
    az webapp start -n $App -g $ResourceGroup | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "az webapp start failed (exit $LASTEXITCODE)." }
    $appStopped = $false
    Write-Host ("`nSnapshot downloaded in {0:m\:ss}; nothing was changed on the server." -f $sw.Elapsed) -ForegroundColor Green
    return
  }

  # Migrate a working copy, never the backup itself. Opening the copy replays
  # the WAL; migrate-db.ts checkpoints it back into a single file.
  Step 'Migrating local copy'
  $workDir = Join-Path $snapDir 'migrated'
  New-Item -ItemType Directory -Force $workDir | Out-Null
  foreach ($f in @($DbName, "$DbName-wal", "$DbName-shm")) {
    $src = Join-Path $snapDir $f
    if (Test-Path $src) { Copy-Item -Force $src (Join-Path $workDir $f) }
  }
  $workDb = Join-Path $workDir $DbName
  npx tsx scripts/migrate-db.ts $workDb
  if ($LASTEXITCODE -ne 0) { throw "Migration failed (exit $LASTEXITCODE). The server still runs the original database; backup at $snapDir." }

  Step 'Uploading migrated database'
  # Remove the stale WAL sidecars FIRST — a leftover -wal from the previous
  # database would be replayed into the new file on the next open, corrupting
  # it. Only then replace the database file itself.
  Remove-RemoteFile $kudu "$DbName-wal"
  Remove-RemoteFile $kudu "$DbName-shm"
  Push-File $kudu $workDb "$RemoteDir/$DbName"

  Step 'Starting app'
  az webapp start -n $App -g $ResourceGroup | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp start failed (exit $LASTEXITCODE)." }
  $appStopped = $false

  Step 'Verifying live site'
  if (Test-Healthy) {
    Write-Host ("`nDatabase migrated; site healthy in {0:m\:ss}: $BaseUrl" -f $sw.Elapsed) -ForegroundColor Green
    Write-Host "Pre-migration backup: $snapDir"
  } else {
    throw "Site did not return 200 within $HealthTimeoutSec s. Pre-migration backup: $snapDir — restore it with: npm run deploy-db -- -Force -File `"$snapDir/$DbName`""
  }
}
finally {
  if ($appStopped) {
    Write-Warning 'Restarting the app after an error...'
    az webapp start -n $App -g $ResourceGroup | Out-Null
  }
}

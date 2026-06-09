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

  Flow: stop the app → upload the DB (and empty -wal/-shm to clobber any stale
  WAL sidecars, which would otherwise corrupt the new file) → start the app →
  poll until the site serves 200. On the next boot the app recreates any missing
  schema and reseeds reference content (services, availability, holidays,
  settings) since the tables are empty.

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

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

function Invoke-AzLogin {
  $loginArgs = @('login', '--only-show-errors')
  if ($Tenant)     { $loginArgs += @('--tenant', $Tenant) }
  if ($DeviceCode) { $loginArgs += '--use-device-code' }
  Write-Host ("Launching az login{0}..." -f $(if ($Tenant) { " (tenant $Tenant)" } else { '' })) -ForegroundColor Yellow
  az @loginArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "az login failed. If the tenant enforces MFA, re-run with -Tenant <id>; on a machine without a browser add -DeviceCode."
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

$emptyWal = $null
$emptyShm = $null
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

  # Stop the app so nothing holds the SQLite file open while we replace it.
  Step 'Stopping app'
  az webapp stop -n $App -g $ResourceGroup | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp stop failed (exit $LASTEXITCODE)." }

  # Zero-byte sidecars to clobber any stale WAL from the previous database — a
  # leftover -wal whose header doesn't match the new file can corrupt reads.
  $emptyWal = New-TemporaryFile
  $emptyShm = New-TemporaryFile
  [System.IO.File]::WriteAllBytes($emptyWal, @())
  [System.IO.File]::WriteAllBytes($emptyShm, @())

  Step 'Uploading database'
  Push-File $File              "$RemoteDir/$DbName"
  Push-File $emptyWal.FullName "$RemoteDir/$DbName-wal"
  Push-File $emptyShm.FullName "$RemoteDir/$DbName-shm"

  Step 'Starting app'
  az webapp start -n $App -g $ResourceGroup | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp start failed (exit $LASTEXITCODE)." }

  Step 'Verifying live site'
  if (Test-Healthy) {
    Write-Host ("`nDatabase deployed; site healthy in {0:m\:ss}: $BaseUrl" -f $sw.Elapsed) -ForegroundColor Green
  } else {
    throw "Site did not return 200 within $HealthTimeoutSec s. Check: $BaseUrl"
  }
}
finally {
  if ($emptyWal) { Remove-Item -Force $emptyWal -ErrorAction SilentlyContinue }
  if ($emptyShm) { Remove-Item -Force $emptyShm -ErrorAction SilentlyContinue }
}

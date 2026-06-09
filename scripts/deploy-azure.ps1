#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Build and deploy the app to Azure App Service.

.DESCRIPTION
  Run via `npm run deploy-azure` (reliable) or `npm run deploy-azure:fast`.

  Reliable mode: ships only source; Azure's Oryx runs `npm install` + `vite build`
  on Linux (SCM_DO_BUILD_DURING_DEPLOYMENT=true). ~4 min.

  Fast mode (-Fast): builds locally and ships a ready-to-run artifact — `build/`
  plus a prod `node_modules` whose single native dep (better-sqlite3) carries a
  Linux prebuilt binary — with Oryx build OFF. Azure just extracts and runs
  `node build`, skipping the remote install/build. Falls back to reliable mode
  automatically if the prebuilt artifact fails its health check.

  Both deploy with `--track-status false` so the CLI can't report a false
  "failed to start" (its startup probe times out even on success — Azure retries
  the container; we verify the live site ourselves).

  Auth: if there's no active Azure session, Preflight runs `az login`
  automatically (browser flow). On a machine without a browser, pass -DeviceCode
  to use the device-code flow instead. If the tenant enforces MFA (AADSTS50076),
  pass -Tenant <id> so login targets that tenant directly.
#>
[CmdletBinding()]
param(
  [switch]$Fast,
  [switch]$DeviceCode,   # use 'az login --use-device-code' (headless / no local browser)
  [string]$Tenant        = '902f14f8-6c86-4d31-9e56-c3715eeca530',   # tenant that owns $Subscription (enforces MFA)
  [string]$App           = 'thai-headspa-ajaccio',
  [string]$ResourceGroup = 'rg-thai-headspa',
  [string]$Subscription  = 'efab821f-1294-49d7-936a-a08350e886f4',
  [string]$NodeTarget    = '22.20.0',   # Node major must match the App Service runtime (ABI)
  [int]$HealthTimeoutSec = 300
)

$ErrorActionPreference = 'Stop'
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Stage    = Join-Path $RepoRoot 'deploy-stage'
$Zip      = Join-Path $RepoRoot 'deploy.zip'
$BaseUrl  = "https://$App.azurewebsites.net"

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# --- helpers -----------------------------------------------------------------

function Set-BuildMode([bool]$OryxBuild) {
  # Toggle SCM_DO_BUILD_DURING_DEPLOYMENT only when it needs to change (a change
  # restarts the app, so avoid churn).
  $want = if ($OryxBuild) { 'true' } else { 'false' }
  $cur = az webapp config appsettings list -n $App -g $ResourceGroup `
    --query "[?name=='SCM_DO_BUILD_DURING_DEPLOYMENT'].value | [0]" -o tsv 2>$null
  if ($cur -ne $want) {
    Write-Host "Setting SCM_DO_BUILD_DURING_DEPLOYMENT=$want"
    az webapp config appsettings set -n $App -g $ResourceGroup `
      --settings "SCM_DO_BUILD_DURING_DEPLOYMENT=$want" | Out-Null
  }
}

function New-Zip($SourceDir) {
  Remove-Item -Force $Zip -ErrorAction SilentlyContinue
  $entries = Get-ChildItem -Force $SourceDir | ForEach-Object { $_.FullName }
  Compress-Archive -Path $entries -DestinationPath $Zip -Force
  Write-Host ("deploy.zip = {0:N1} MB" -f ((Get-Item $Zip).Length / 1MB))
}

function Invoke-Deploy {
  az webapp deploy -n $App -g $ResourceGroup --src-path $Zip --type zip `
    --clean true --track-status false | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "az webapp deploy failed (exit $LASTEXITCODE)." }
}

function Test-Healthy {
  # Poll until the site serves 200 (proves the container booted and better-sqlite3
  # loaded — the root load() queries the DB). Returns $true/$false.
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

# Reliable: stage source only; Oryx builds it on Azure.
function Build-SourceStage {
  $include = @(
    'package.json', 'package-lock.json', 'svelte.config.js', 'vite.config.ts',
    'tsconfig.json', '.npmrc', '.node-version', 'src', 'static', 'scripts'
  )
  Remove-Item -Recurse -Force $Stage -ErrorAction SilentlyContinue
  New-Item -ItemType Directory $Stage | Out-Null
  foreach ($item in $include) {
    $path = Join-Path $RepoRoot $item
    if (-not (Test-Path $path)) { throw "Missing expected source item: $item" }
    Copy-Item -Recurse -Force $path (Join-Path $Stage $item)
  }
}

# Fast: build locally + assemble a prod node_modules with a Linux better-sqlite3.
function Build-PrebuiltStage {
  Step 'Local build (vite)'
  Push-Location $RepoRoot
  try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'vite build failed.' }
  } finally { Pop-Location }

  Step 'Installing production dependencies'
  Remove-Item -Recurse -Force $Stage -ErrorAction SilentlyContinue
  New-Item -ItemType Directory $Stage | Out-Null
  Copy-Item -Force (Join-Path $RepoRoot 'package.json') $Stage
  Copy-Item -Force (Join-Path $RepoRoot 'package-lock.json') $Stage
  Copy-Item -Force (Join-Path $RepoRoot '.node-version') $Stage
  Copy-Item -Recurse -Force (Join-Path $RepoRoot 'build') (Join-Path $Stage 'build')
  Push-Location $Stage
  try {
    npm ci --omit=dev --no-audit --no-fund --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'prod npm ci failed.' }
  } finally { Pop-Location }

  Step 'Fetching Linux prebuilt for better-sqlite3'
  $bsq = Join-Path $Stage 'node_modules/better-sqlite3'
  # prebuild-install may be hoisted to the top level or nested under better-sqlite3.
  $prebuild = @(
    (Join-Path $Stage 'node_modules/prebuild-install/bin.js'),
    (Join-Path $bsq 'node_modules/prebuild-install/bin.js')
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $prebuild) { throw 'prebuild-install not found in node_modules.' }
  Push-Location $bsq
  try {
    node $prebuild --platform linux --arch x64 --target $NodeTarget --runtime node
    if ($LASTEXITCODE -ne 0) { throw "prebuild-install could not download a linux-x64 prebuilt for node $NodeTarget." }
  } finally { Pop-Location }

  # Verify the binary is a Linux ELF (magic: 0x7F 'E' 'L' 'F'), not the Windows .node.
  $bin = Join-Path $bsq 'build/Release/better_sqlite3.node'
  if (-not (Test-Path $bin)) { throw "Prebuilt binary missing: $bin" }
  $magic = [System.IO.File]::ReadAllBytes($bin)[0..3]
  if (-not ($magic[0] -eq 0x7F -and $magic[1] -eq 0x45 -and $magic[2] -eq 0x4C -and $magic[3] -eq 0x46)) {
    throw "better_sqlite3.node is not a Linux ELF binary (got bytes $($magic -join ','))."
  }
  Write-Host 'Verified Linux ELF better-sqlite3 binary.'
}

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

# --- main --------------------------------------------------------------------

try {
  Step 'Preflight'
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI 'az' not found on PATH. Install it and run 'az login'."
  }

  # Ensure an authenticated session exists.
  if (-not (az account show --query id -o tsv 2>$null)) {
    Write-Host 'No active Azure session.' -ForegroundColor Yellow
    Invoke-AzLogin
    if (-not (az account show --query id -o tsv 2>$null)) { throw 'Still not authenticated after az login.' }
  }

  # Select the target subscription. If it isn't in the current session — typically
  # because it lives in an MFA-protected tenant the bare login couldn't enumerate —
  # (re)authenticate (honoring -Tenant) and retry once.
  az account set --subscription $Subscription 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Subscription $Subscription not in current session — re-authenticating..." -ForegroundColor Yellow
    Invoke-AzLogin
    az account set --subscription $Subscription 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "Subscription $Subscription is not available to this account.`n  - If it lives in an MFA-protected tenant, re-run with: -Tenant <tenant-id>`n  - See what you can access:  az account list -o table"
    }
  }
  Write-Host "Account: $(az account show --query 'user.name' -o tsv)  /  $App ($ResourceGroup)  [mode: $(if ($Fast) {'fast'} else {'reliable'})]"

  if ($Fast) {
    Build-PrebuiltStage
    Set-BuildMode $false
  } else {
    Step 'Staging source'
    Build-SourceStage
    Set-BuildMode $true
  }

  Step 'Building deploy.zip'
  New-Zip $Stage

  Step 'Deploying to Azure'
  Invoke-Deploy
  Write-Host 'Upload reported success by Kudu.'

  Step 'Verifying live site'
  if (Test-Healthy) {
    Write-Host ("`nDeployed and healthy in {0:m\:ss}: $BaseUrl" -f $sw.Elapsed) -ForegroundColor Green
  }
  elseif ($Fast) {
    # The prebuilt artifact didn't boot — fall back to the reliable Oryx build.
    Write-Warning 'Fast artifact failed health check; falling back to reliable Oryx build...'
    Step 'Staging source (fallback)'
    Build-SourceStage
    Set-BuildMode $true
    New-Zip $Stage
    Invoke-Deploy
    if (Test-Healthy) {
      Write-Host ("`nDeployed via fallback in {0:m\:ss}: $BaseUrl" -f $sw.Elapsed) -ForegroundColor Green
    } else {
      throw "Site did not return 200 within $HealthTimeoutSec s (even after fallback). Check: $BaseUrl"
    }
  }
  else {
    throw "Site did not return 200 within $HealthTimeoutSec s. Check: $BaseUrl"
  }
}
finally {
  Remove-Item -Recurse -Force $Stage -ErrorAction SilentlyContinue
  Remove-Item -Force $Zip -ErrorAction SilentlyContinue
}

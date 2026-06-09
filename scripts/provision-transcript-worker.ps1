# One-time: deploy the Python transcript worker and wire TRANSCRIPT_WORKER_URL into Supabase.
# This is required for fully automatic server-side YouTube captions (no paste / no manual retry).
#
# Option A — Render (recommended, free tier):
#   1. Open https://dashboard.render.com/blueprints
#   2. New Blueprint → connect this GitHub repo → deploy render.yaml
#   3. Copy the service URL (e.g. https://youtube-transcript-worker.onrender.com)
#   4. Copy WORKER_TOKEN from Render → Environment
#   5. Add to .env:
#        TRANSCRIPT_WORKER_URL=https://youtube-transcript-worker.onrender.com
#        TRANSCRIPT_WORKER_TOKEN=<same as Render WORKER_TOKEN>
#   6. Run: powershell -ExecutionPolicy Bypass -File scripts/sync-transcript-secrets.ps1
#   7. Run: npx supabase functions deploy framework-fetch-transcript --project-ref itmcsyrnpcnrwviigppe
#
# Option B — Railway (if logged in):
#   cd worker/youtube-transcript
#   railway login
#   railway up
#   railway domain
#   Then set TRANSCRIPT_WORKER_URL in .env and run sync-transcript-secrets.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "Checking Railway CLI login..."
$whoami = npx @railway/cli whoami 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "Railway account: $whoami"
  Write-Host "Deploying worker from worker/youtube-transcript ..."
  Push-Location worker/youtube-transcript
  $token = $env:TRANSCRIPT_WORKER_TOKEN
  if (-not $token) {
    $line = Get-Content "$root\.env" -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*TRANSCRIPT_WORKER_TOKEN\s*=' } | Select-Object -First 1
    if ($line) { $token = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'") }
  }
  if (-not $token) {
    $token = [guid]::NewGuid().ToString()
    Write-Host "Generated WORKER_TOKEN for Railway: $token"
  }
  $env:WORKER_TOKEN = $token
  npx @railway/cli up --detach
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  $domain = npx @railway/cli domain 2>&1
  Pop-Location
  Write-Host "Railway domain output:"
  Write-Host $domain
  Write-Host ""
  Write-Host "Add to .env:"
  Write-Host "  TRANSCRIPT_WORKER_URL=<your railway https url>"
  Write-Host "  TRANSCRIPT_WORKER_TOKEN=$token"
  Write-Host "Then run: powershell -ExecutionPolicy Bypass -File scripts/sync-transcript-secrets.ps1"
  exit 0
}

Write-Host "Railway not logged in. Use Render Blueprint (Option A in script header)."
Write-Host "Blueprint: https://dashboard.render.com/blueprints"
Write-Host "Repo includes render.yaml → service name youtube-transcript-worker"
Write-Host ""
Write-Host "TRANSCRIPT_WORKER_TOKEN is already in Supabase; only TRANSCRIPT_WORKER_URL is missing."

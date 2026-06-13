# Run the Python transcript worker locally (port 8787).
# Production: deploy via Render blueprint (render.yaml) and set TRANSCRIPT_WORKER_URL in .env.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location (Join-Path $root "worker\youtube-transcript")

function Read-DotEnvValue([string]$name) {
  $envPath = Join-Path $root ".env"
  if (-not (Test-Path $envPath)) { return $null }
  $line = Get-Content $envPath | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  $v = ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
  if (-not $v) { return $null }
  return $v
}

$token = Read-DotEnvValue "TRANSCRIPT_WORKER_TOKEN"
if (-not $token) {
  $token = [guid]::NewGuid().ToString()
  Write-Host "No TRANSCRIPT_WORKER_TOKEN in .env — using ephemeral token for this session."
  Write-Host "Add to .env and Supabase secrets for production:"
  Write-Host "  TRANSCRIPT_WORKER_TOKEN=$token"
}

$env:WORKER_TOKEN = $token
$env:PORT = "8787"

Write-Host "Starting transcript worker on http://127.0.0.1:8787"
Write-Host "Health: http://127.0.0.1:8787/health"
Write-Host ""
Write-Host "For Supabase edge functions, set in .env then run scripts/sync-transcript-secrets.ps1:"
Write-Host "  TRANSCRIPT_WORKER_URL=http://127.0.0.1:8787   # local tunnel only"
Write-Host "  TRANSCRIPT_WORKER_URL=https://YOUR-SERVICE.onrender.com   # production"
Write-Host ""

python -m uvicorn app:app --host 127.0.0.1 --port 8787 --reload

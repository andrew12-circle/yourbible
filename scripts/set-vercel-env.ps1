# Copies Supabase + optional Sentry env from local .env → Vercel, then production deploy.
# Run: powershell -ExecutionPolicy Bypass -File scripts/set-vercel-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Read-DotEnvValue([string]$name) {
  if (-not (Test-Path .env)) { return $null }
  $line = Get-Content .env | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  $v = ($line -split "=", 2)[1].Trim()
  if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
  if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
  return $v
}

$url = Read-DotEnvValue "VITE_SUPABASE_URL"
$key = Read-DotEnvValue "VITE_SUPABASE_PUBLISHABLE_KEY"
if (-not $key) { $key = Read-DotEnvValue "VITE_SUPABASE_ANON_KEY" }
$sentry = Read-DotEnvValue "VITE_SENTRY_DSN"

if (-not $url -or -not $key) { throw "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env" }

Write-Host "Linking to Vercel project yourbible..."
npx vercel@latest link --yes --project yourbible

foreach ($target in @("production", "preview", "development")) {
  Write-Host "Setting env for $target..."
  $url | npx vercel@latest env add VITE_SUPABASE_URL $target --force
  $key | npx vercel@latest env add VITE_SUPABASE_PUBLISHABLE_KEY $target --force
  if ($sentry) {
    $sentry | npx vercel@latest env add VITE_SENTRY_DSN $target --force
  }
}

if (-not $sentry) {
  Write-Host "Tip: add VITE_SENTRY_DSN to .env for error monitoring, then re-run this script."
}

Write-Host "Production deploy..."
npx vercel@latest deploy --prod --yes

Write-Host "Done."

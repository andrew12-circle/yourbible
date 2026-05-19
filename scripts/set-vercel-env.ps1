# Copies Supabase env from local .env → Vercel, then production deploy.
# Run: powershell -ExecutionPolicy Bypass -File scripts/set-vercel-env.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Read-DotEnvValue([string]$name) {
  if (-not (Test-Path .env)) { throw ".env not found" }
  $line = Get-Content .env | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) { throw "Missing $name in .env" }
  $v = ($line -split "=", 2)[1].Trim()
  if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
  if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
  return $v
}

$url = Read-DotEnvValue "VITE_SUPABASE_URL"
$key = Read-DotEnvValue "VITE_SUPABASE_PUBLISHABLE_KEY"
if (-not $key) { $key = Read-DotEnvValue "VITE_SUPABASE_ANON_KEY" }

Write-Host "Linking to Vercel project yourbible..."
npx vercel@latest link --yes --project yourbible

foreach ($target in @("production", "preview", "development")) {
  Write-Host "Setting env for $target..."
  $url | npx vercel@latest env add VITE_SUPABASE_URL $target --force
  $key | npx vercel@latest env add VITE_SUPABASE_PUBLISHABLE_KEY $target --force
}

Write-Host "Production deploy..."
npx vercel@latest deploy --prod --yes

Write-Host "Done."

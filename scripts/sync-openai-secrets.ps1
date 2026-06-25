# Sync OpenAI-related secrets from .env to Supabase edge functions.
# Run: powershell -ExecutionPolicy Bypass -File scripts/sync-openai-secrets.ps1

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
  if (-not $v) { return $null }
  return $v
}

$projectRef = "itmcsyrnpcnrwviigppe"
$keys = @("OPENAI_API_KEY", "AI_PROVIDER", "OPENAI_CHAT_MODEL", "GEMINI_API_KEY")

$toSet = @{}
foreach ($key in $keys) {
  $val = Read-DotEnvValue $key
  if ($val) { $toSet[$key] = $val }
}

if ($toSet.Count -eq 0) {
  Write-Host "No OpenAI secrets found in .env (OPENAI_API_KEY, AI_PROVIDER, OPENAI_CHAT_MODEL)."
  exit 0
}

$args = @("secrets", "set")
foreach ($entry in $toSet.GetEnumerator()) {
  $args += "$($entry.Key)=$($entry.Value)"
}
$args += "--project-ref"
$args += $projectRef

Write-Host "Setting Supabase secrets: $($toSet.Keys -join ', ')"
& npx supabase @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Claim extraction will use OpenAI on the next analyze invoke."

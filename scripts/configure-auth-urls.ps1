# Sets Supabase Auth site URL + redirect allowlist for production beta.
# Run: powershell -ExecutionPolicy Bypass -File scripts/configure-auth-urls.ps1
# Optional: -SiteUrl https://www.thecirclesystem.com

param(
  [string]$SiteUrl = "https://www.thecirclesystem.com"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
$projectRef = "itmcsyrnpcnrwviigppe"

function Read-DotEnvValue([string]$name) {
  if (-not (Test-Path .env)) { throw ".env not found" }
  foreach ($raw in Get-Content .env) {
    $line = $raw.TrimEnd("`r")
    if ($line -match "^\s*#") { continue }
    if ($line -match "^\s*$name\s*=\s*(.*)$") {
      $v = $Matches[1].Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
      return $v
    }
  }
  throw "Missing $name in .env"
}

$token = Read-DotEnvValue "SUPABASE_ACCESS_TOKEN"
$base = $SiteUrl.TrimEnd("/")
$allow = @(
  "$base/**",
  "$base/auth/reset",
  "$base/onboarding",
  "http://localhost:8083/**",
  "http://localhost:5173/**"
) | Select-Object -Unique

$body = @{
  site_url                   = $base
  uri_allow_list             = ($allow -join ",")
  mailer_autoconfirm         = $false
} | ConvertTo-Json

Write-Host "Updating Supabase Auth config for $base ..."
$r = Invoke-RestMethod `
  -Method PATCH `
  -Uri "https://api.supabase.com/v1/projects/$projectRef/config/auth" `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body

Write-Host "Site URL: $($r.site_url)"
Write-Host "Redirect allowlist updated."
Write-Host "Done."

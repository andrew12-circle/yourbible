# Quick Gemini key smoke test (does not print the full key).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$line = Get-Content .env | Where-Object { $_ -match "^\s*GEMINI_API_KEY\s*=" } | Select-Object -First 1
if (-not $line) { Write-Error "GEMINI_API_KEY not found in .env"; exit 1 }
$v = ($line -split "=", 2)[1].Trim().Trim('"')

Write-Host "Key length: $($v.Length)"
Write-Host "Key prefix: $($v.Substring(0, [Math]::Min(8, $v.Length)))..."

$uri = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$v"
$body = @{
  contents = @(@{ parts = @(@{ text = "Reply with exactly: ok" }) })
  generationConfig = @{ maxOutputTokens = 8 }
} | ConvertTo-Json -Depth 6

try {
  $r = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json" -Body $body
  $text = $r.candidates[0].content.parts[0].text
  Write-Host "Gemini OK - reply: $text"
} catch {
  $resp = $_.Exception.Response
  $status = $resp.StatusCode.value__
  $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $errBody = $reader.ReadToEnd()
  Write-Host "Gemini HTTP $status"
  Write-Host ($errBody.Substring(0, [Math]::Min(500, $errBody.Length)))
  exit 1
}

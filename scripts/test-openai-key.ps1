# Quick OpenAI key smoke test (does not print the full key).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$line = Get-Content .env | Where-Object { $_ -match "^\s*OPENAI_API_KEY\s*=" } | Select-Object -First 1
if (-not $line) { Write-Error "OPENAI_API_KEY not found in .env"; exit 1 }
$v = ($line -split "=", 2)[1].Trim()
if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }

Write-Host "Key length: $($v.Length)"
Write-Host "Key prefix: $($v.Substring(0, [Math]::Min(12, $v.Length)))..."

$body = @{
  model = "gpt-4o-mini"
  messages = @(@{ role = "user"; content = "ping" })
  max_tokens = 5
} | ConvertTo-Json -Depth 5

try {
  $r = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method POST `
    -Headers @{ Authorization = "Bearer $v"; "Content-Type" = "application/json" } -Body $body
  Write-Host "OpenAI OK - model $($r.model)"
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  $err = $reader.ReadToEnd()
  Write-Host "OpenAI HTTP $status"
  Write-Host ($err.Substring(0, [Math]::Min(300, $err.Length)))
  exit 1
}

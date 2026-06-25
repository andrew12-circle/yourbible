# Smoke test OPENAI_CHAT_MODEL from .env (uses max_completion_tokens for gpt-5.x).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Read-DotEnvValue([string]$name) {
  $line = Get-Content .env | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  $v = ($line -split "=", 2)[1].Trim().Trim('"')
  return $v
}

$key = Read-DotEnvValue "OPENAI_API_KEY"
$model = Read-DotEnvValue "OPENAI_CHAT_MODEL"
if (-not $key -or -not $model) { Write-Error "Missing OPENAI_API_KEY or OPENAI_CHAT_MODEL"; exit 1 }

$usesMaxCompletion = $model -match '^gpt-5' -or $model -match '^o\d'
$bodyObj = @{
  model = $model
  messages = @(
    @{ role = "system"; content = "Return strict JSON only." }
    @{ role = "user"; content = 'Return JSON: {"claims":[{"claim":"test"}]}' }
  )
  response_format = @{ type = "json_object" }
}
if ($usesMaxCompletion) { $bodyObj.max_completion_tokens = 64 } else { $bodyObj.max_tokens = 64; $bodyObj.temperature = 0.35 }
$body = $bodyObj | ConvertTo-Json -Depth 5

Write-Host "Model: $model (max_completion_tokens=$usesMaxCompletion)"

try {
  $r = Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" -Method POST `
    -Headers @{ Authorization = "Bearer $key"; "Content-Type" = "application/json" } -Body $body
  Write-Host "OK: $($r.choices[0].message.content.Substring(0, [Math]::Min(80, $r.choices[0].message.content.Length)))"
} catch {
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  Write-Host $reader.ReadToEnd()
  exit 1
}

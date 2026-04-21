param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(61, 80)]
  [int]$CaseId,
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Duration = "",
  [string]$Rate = "",
  [string]$Vus = ""
)

$envArgs = @(
  "-e", "BASE_URL=$BaseUrl",
  "-e", "CASE_ID=$CaseId"
)

if ($Duration) { $envArgs += @("-e", "DURATION=$Duration") }
if ($Rate) { $envArgs += @("-e", "RATE=$Rate") }
if ($Vus) { $envArgs += @("-e", "VUS=$Vus") }

$scriptPath = Join-Path $PSScriptRoot "level7_8_suite.js"

Write-Host "Running CASE_ID=$CaseId with BASE_URL=$BaseUrl"
& k6 run @envArgs $scriptPath

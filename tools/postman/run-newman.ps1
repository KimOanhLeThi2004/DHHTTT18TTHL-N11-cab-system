
param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExpiredToken = "expired_token",
  [int]$AssignMaxLatencyMs = 5000,
  [int]$AssignMaxPollTries = 25,
  [int]$AssignPollIntervalMs = 300
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$collectionPath = Join-Path $scriptDir "taxi-auto-tests.postman_collection.json"
$environmentPath = Join-Path $scriptDir "taxi-local.postman_environment.json"
$junitPath = Join-Path $scriptDir "newman-report.xml"

Write-Host "Running Postman automation with Newman..."
Write-Host "BaseUrl: $BaseUrl"
Write-Host "Assign latency threshold: ${AssignMaxLatencyMs}ms"
Write-Host "Assign poll interval: ${AssignPollIntervalMs}ms"

npx newman run $collectionPath `
  -e $environmentPath `
  --env-var baseUrl=$BaseUrl `
  --env-var expiredToken=$ExpiredToken `
  --env-var assignMaxLatencyMs=$AssignMaxLatencyMs `
  --env-var assignMaxPollTries=$AssignMaxPollTries `
  --env-var assignPollIntervalMs=$AssignPollIntervalMs `
  --reporters cli,junit `
  --reporter-junit-export $junitPath

if ($LASTEXITCODE -ne 0) {
  throw "Newman failed with exit code $LASTEXITCODE"
}

Write-Host "Done. JUnit report: $junitPath"

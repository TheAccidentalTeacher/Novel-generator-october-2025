Param(
  [string]$Url = 'http://localhost:3000/health'
)

$ErrorActionPreference = 'Stop'

try {
  $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 5
  $response | ConvertTo-Json -Compress
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)"
  exit 1
}

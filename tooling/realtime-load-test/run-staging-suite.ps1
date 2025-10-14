Param(
  [string]$OutputDir = '..\\..\\docs\\qa\\load-test-reports\\2025-10-10',
  [string]$Label = 'staging'
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host "[SUITE] Running with output=$OutputDir label=$Label"
pnpm build | Out-Host
pnpm suite -- --config configs/staging.json --output $OutputDir --label $Label

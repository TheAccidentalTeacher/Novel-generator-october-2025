Param()

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot
$env:NODE_ENV = 'staging'

# Ensure build exists
if (-not (Test-Path -Path '.\\dist\\apps\\api\\src\\main.js')) {
  Write-Host '[API] Compiled entry not found. Building...'
  pnpm --filter @letswriteabook/api build | Out-Host
}

# If port 3000 is in use by a node process from an earlier run, stop it
$existing = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  try {
    $proc = Get-Process -Id $existing.OwningProcess -ErrorAction Stop
    if ($proc.ProcessName -eq 'node') {
      Write-Host "[API] Port 3000 in use by PID=$($proc.Id). Stopping..."
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      Start-Sleep -Milliseconds 400
    }
  } catch {}
}

Write-Host "[API] Launching (NODE_ENV=$env:NODE_ENV) from $PSScriptRoot"
$logFile = Join-Path $PSScriptRoot '.\\staging-api.log'
$errFile = Join-Path $PSScriptRoot '.\\staging-api.err.log'
$p = Start-Process -FilePath 'node' -WorkingDirectory $PSScriptRoot -ArgumentList 'dist\\apps\\api\\src\\main.js' -WindowStyle Minimized -RedirectStandardOutput $logFile -RedirectStandardError $errFile -PassThru
"$($p.Id)" | Out-File -FilePath '.\\.staging-api.pid' -Encoding ascii -Force
Write-Host "[API] Started PID=$($p.Id). Logs: $logFile | Errors: $errFile"


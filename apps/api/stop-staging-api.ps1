Param()
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

if (Test-Path '.\\.staging-api.pid') {
  $apiPid = Get-Content '.\\.staging-api.pid' | Select-Object -First 1
  if ($apiPid) {
    try {
      $p = Get-Process -Id $apiPid -ErrorAction Stop
      if ($p.ProcessName -eq 'node') {
        Write-Host "[API] Stopping PID=$apiPid..."
        Stop-Process -Id $apiPid -Force
        Remove-Item '.\\.staging-api.pid' -Force -ErrorAction SilentlyContinue
        Write-Host '[API] Stopped.'
        exit 0
      }
    } catch {}
  }
}

Write-Host '[API] No PID file found or process not running.'
exit 0

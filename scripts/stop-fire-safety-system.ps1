[CmdletBinding()]
param()

. (Join-Path $PSScriptRoot "fire-safety-service-common.ps1")
$serviceLock = $null
$exitCode = 0

try {
  $serviceLock = Enter-ServiceLock
  Write-Host "Fire Safety - Stop current system + Theme demo + Backend" -ForegroundColor Cyan
  $records = @(Read-ServiceRecords)
  $stoppedCount = 0
  # Stop frontends first, then the shared backend.
  foreach ($kind in @('current', 'demo', 'backend')) {
    $service = $Services | Where-Object { $_.kind -eq $kind } | Select-Object -First 1
    $targets = @($records | Where-Object { Test-ServiceRecord -Record $_ -Service $service })
    $processInfo = Get-OwnedServiceProcess -Service $service
    if ($processInfo -and @($targets | ForEach-Object { $_.pid }) -notcontains $processInfo.ProcessId) {
      $targets += New-ServiceRecord -ProcessId $processInfo.ProcessId -Service $service
    }
    foreach ($record in $targets) {
      Stop-OwnedService -Record $record -Service $service
      $stoppedCount++
    }
    if ($targets.Count -eq 0) {
      Write-Host "[OK] No owned $kind service is running."
    }
  }
  Start-Sleep -Milliseconds 500
  foreach ($service in $Services) {
    if (Get-OwnedServiceProcess -Service $service) { throw "$($service.kind) still owns port $($service.port)." }
    foreach ($record in $records) {
      if (Test-ServiceRecord -Record $record -Service $service) { throw "Recorded $($service.kind) process is still running." }
    }
    $remainingId = Get-ListeningProcessId -Port $service.port
    if ($null -ne $remainingId) {
      Write-Host "[INFO] Port $($service.port) belongs to another process (PID $remainingId); left running."
    }
  }
  Save-ServiceRecords -Records @() -Status 'stopped'
  Write-Host "[OK] Shutdown complete. Stopped $stoppedCount project service(s)." -ForegroundColor Green
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  $exitCode = 1
} finally {
  if ($serviceLock) { $serviceLock.Dispose() }
}
exit $exitCode

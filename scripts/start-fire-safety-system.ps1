[CmdletBinding()]
param([switch]$NoBrowser)

. (Join-Path $PSScriptRoot "fire-safety-service-common.ps1")
$serviceLock = $null
$exitCode = 0

try {
  $serviceLock = Enter-ServiceLock
  Write-Host "Fire Safety - Current system + Theme demo" -ForegroundColor Cyan
  $nodeCommand = Get-Command node.exe -ErrorAction Stop
  foreach ($entry in @($ViteEntry, $TsxEntry, $BackendEntry, (Join-Path $ProjectDirectory 'theme-prototype.html'))) {
    if (-not (Test-Path -LiteralPath $entry)) {
      throw "Required file is missing: $entry. For missing node_modules, run npm install in the project directory."
    }
  }
  if ($env:PORT -and $env:PORT -ne '8080') {
    throw "Environment PORT=$env:PORT conflicts with the configured backend port 8080. Clear PORT before starting."
  }

  $records = @(Read-ServiceRecords)
  $owned = @{}
  # Validate every fixed port before starting anything; never take over another service.
  foreach ($service in $Services) {
    $processInfo = Get-OwnedServiceProcess -Service $service
    $listeningId = Get-ListeningProcessId -Port $service.port
    if ($null -ne $listeningId -and $null -eq $processInfo) {
      throw "Port $($service.port) is occupied by another process (PID $listeningId). No service was replaced."
    }
    if ($processInfo) {
      $owned[$service.kind] = New-ServiceRecord -ProcessId $processInfo.ProcessId -Service $service
    } else {
      $saved = $records | Where-Object { Test-ServiceRecord -Record $_ -Service $service } | Select-Object -First 1
      if ($saved) { $owned[$service.kind] = $saved }
    }
  }
  $activeRecords = @($owned.Values)
  Save-ServiceRecords -Records $activeRecords -Status 'starting'
  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'

  foreach ($service in $Services) {
    if ($owned.ContainsKey($service.kind)) {
      if (-not (Wait-ServiceHealth -Service $service)) {
        throw "Owned $($service.kind) process is unhealthy. Run the stop script, then start again. Logs: $RuntimeDirectory"
      }
      Write-Host "[OK] Reusing $($service.kind) on port $($service.port). PID: $($owned[$service.kind].pid)" -ForegroundColor Green
      continue
    }
    Write-Host "[INFO] Starting $($service.kind) on port $($service.port)..." -ForegroundColor Cyan
    $outputLog = Join-Path $RuntimeDirectory "$($service.kind)-$timestamp.out.log"
    $errorLog = Join-Path $RuntimeDirectory "$($service.kind)-$timestamp.err.log"
    $process = Start-HiddenService -NodePath $nodeCommand.Source -Service $service -OutputLog $outputLog -ErrorLog $errorLog
    $record = New-ServiceRecord -ProcessId $process.Id -Service $service
    $activeRecords += $record
    # Save immediately, so the stop script can also recover a partially failed start.
    Save-ServiceRecords -Records $activeRecords -Status 'starting'
    if (-not (Wait-ServiceHealth -Service $service)) {
      Get-Content -LiteralPath $outputLog,$errorLog -Tail 15 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
      throw "$($service.kind) did not become ready. Logs: $RuntimeDirectory"
    }
    $readyProcess = Get-OwnedServiceProcess -Service $service
    if (-not $readyProcess -or $readyProcess.ProcessId -ne $record.pid) {
      throw "The listening process for $($service.kind) does not match the process just started."
    }
    Write-Host "[OK] Ready: $($service.kind), port $($service.port), PID $($record.pid)" -ForegroundColor Green
  }
  Save-ServiceRecords -Records $activeRecords -Status 'running'
  Write-Host ""
  Write-Host "Current system : http://127.0.0.1:5187/"
  Write-Host "Theme demo     : http://127.0.0.1:5186/theme-prototype.html"
  Write-Host "Backend health : http://127.0.0.1:8080/api/health"
  Write-Host "Logs           : $RuntimeDirectory"
  if (-not $NoBrowser) {
    foreach ($url in @('http://127.0.0.1:5187/', 'http://127.0.0.1:5186/theme-prototype.html')) {
      try { Start-Process -FilePath $url | Out-Null }
      catch { Write-Host "[WARN] Could not open browser. Open this URL manually: $url" -ForegroundColor Yellow }
    }
  }
} catch {
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  $exitCode = 1
} finally {
  if ($serviceLock) { $serviceLock.Dispose() }
}
exit $exitCode

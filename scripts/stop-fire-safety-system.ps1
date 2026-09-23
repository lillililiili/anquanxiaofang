[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)]
  [int]$PreferredFrontendPort = 5176,

  [ValidateRange(1024, 65535)]
  [int]$MaxFrontendPort = 5199
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$RuntimeDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "fire-safety-inspection-system"
$StateFile = Join-Path $RuntimeDirectory "state.json"

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Get-ListeningProcessId {
  param([int]$Port)

  $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    return [int]$listener.OwningProcess
  }
  return $null
}

function Test-BackendHealth {
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/health" -TimeoutSec 2
    return $response.success -eq $true
  } catch {
    return $false
  }
}

function Test-FireSafetyFrontend {
  param([int]$Port)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/" -TimeoutSec 5
    return $response.StatusCode -eq 200 `
      -and $response.Content.Contains('/src/main.tsx') `
      -and $response.Content.Contains('id="root"')
  } catch {
    return $false
  }
}

function Get-BackendRootProcessId {
  $ownerProcessId = Get-ListeningProcessId -Port 8080
  if ($null -eq $ownerProcessId) {
    return $null
  }

  $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerProcessId" -ErrorAction SilentlyContinue
  $ownerHasServerEntry = $owner -and ($owner.CommandLine.Contains("server/src/index.ts") -or $owner.CommandLine.Contains("server\src\index.ts"))
  if (-not $owner -or -not $owner.CommandLine.Contains($ProjectDirectory) -or -not $ownerHasServerEntry) {
    return $null
  }

  $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($owner.ParentProcessId)" -ErrorAction SilentlyContinue
  $parentHasServerEntry = $parent -and ($parent.CommandLine.Contains("server/src/index.ts") -or $parent.CommandLine.Contains("server\src\index.ts"))
  if ($parent -and $parent.CommandLine.Contains("tsx") -and $parentHasServerEntry) {
    return [int]$parent.ProcessId
  }

  return [int]$owner.ProcessId
}

function Test-RecordedProcess {
  param([object]$Record)

  if ($null -eq $Record) {
    return $false
  }

  $process = Get-Process -Id ([int]$Record.pid) -ErrorAction SilentlyContinue
  if (-not $process) {
    return $false
  }

  $expectedStart = [DateTime]::Parse([string]$Record.startTimeUtc).ToUniversalTime()
  if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $expectedStart).TotalSeconds) -gt 1) {
    return $false
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.Id)" -ErrorAction SilentlyContinue
  if (-not $processInfo) {
    return $false
  }

  if ($Record.kind -eq "frontend") {
    return $processInfo.CommandLine.Contains("vite") `
      -and $processInfo.CommandLine.Contains("--port $($Record.port)") `
      -and $processInfo.CommandLine.Contains($ProjectDirectory)
  }

  if ($Record.kind -eq "backend") {
    return $processInfo.CommandLine.Contains($ProjectDirectory) `
      -and ($processInfo.CommandLine.Contains("server/src/index.ts") -or $processInfo.CommandLine.Contains("server\src\index.ts"))
  }

  return $false
}

function Stop-ProcessTree {
  param(
    [int]$ProcessId,
    [string]$Kind
  )

  if (-not (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)) {
    return $false
  }

  $taskkillOutput = & taskkill.exe /PID $ProcessId /T /F 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to stop $Kind process $ProcessId. $($taskkillOutput -join ' ')"
  }

  Write-Ok "Stopped $Kind process tree. Process ID: $ProcessId"
  return $true
}

try {
  Write-Host "=================================================" -ForegroundColor DarkBlue
  Write-Host " Fire Safety Inspection System - One Click Stop " -ForegroundColor White
  Write-Host "=================================================" -ForegroundColor DarkBlue

  $frontendTargets = @()
  $backendTarget = $null

  if (Test-Path -LiteralPath $StateFile) {
    try {
      $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
      if ($state.projectDirectory -eq $ProjectDirectory) {
        if (Test-RecordedProcess -Record $state.frontend) {
          $frontendTargets += $state.frontend
        }
        if (Test-RecordedProcess -Record $state.backend) {
          $backendTarget = $state.backend
        }
      }
    } catch {
      Write-Host "[WARN] Saved process state is invalid; using safe process discovery." -ForegroundColor Yellow
    }
  }

  $listeningFrontendPorts = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port |
    Where-Object { $_ -ge $PreferredFrontendPort -and $_ -le $MaxFrontendPort } |
    Sort-Object -Unique

  foreach ($port in $listeningFrontendPorts) {
    if (Test-FireSafetyFrontend -Port $port) {
      $processId = Get-ListeningProcessId -Port $port
      $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
      $alreadyAdded = $frontendTargets | Where-Object { [int]$_.pid -eq $processId }
      if (-not $alreadyAdded -and $processInfo `
        -and $processInfo.CommandLine.Contains("vite") `
        -and $processInfo.CommandLine.Contains("--port $port") `
        -and $processInfo.CommandLine.Contains($ProjectDirectory)) {
        $frontendTargets += [pscustomobject]@{ pid = $processId; kind = "frontend"; port = $port }
      }
    }
  }

  if ($null -eq $backendTarget -and (Test-BackendHealth)) {
    $backendProcessId = Get-BackendRootProcessId
    if ($null -ne $backendProcessId) {
      $backendTarget = [pscustomobject]@{ pid = $backendProcessId; kind = "backend"; port = 8080 }
    }
  }

  $stoppedAny = $false
  foreach ($frontendTarget in $frontendTargets) {
    $stoppedAny = (Stop-ProcessTree -ProcessId ([int]$frontendTarget.pid) -Kind "frontend on port $($frontendTarget.port)") -or $stoppedAny
  }
  if ($null -ne $backendTarget) {
    $stoppedAny = (Stop-ProcessTree -ProcessId ([int]$backendTarget.pid) -Kind "backend") -or $stoppedAny
  }

  if (Test-Path -LiteralPath $StateFile) {
    Remove-Item -LiteralPath $StateFile -Force
  }

  if ($stoppedAny) {
    Start-Sleep -Milliseconds 500
    Write-Ok "Fire safety inspection system is stopped."
  } else {
    Write-Ok "System is already stopped; no owned process was found."
  }

  exit 0
} catch {
  Write-Host ""
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

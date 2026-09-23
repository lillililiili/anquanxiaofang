[CmdletBinding()]
param(
  [ValidateRange(1024, 65535)]
  [int]$PreferredFrontendPort = 5176,

  [ValidateRange(1024, 65535)]
  [int]$MaxFrontendPort = 5199,

  [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$RuntimeDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "fire-safety-inspection-system"
$StateFile = Join-Path $RuntimeDirectory "state.json"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Write-Step {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Test-PortAvailable {
  param([int]$Port)

  $activePorts = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
  return $activePorts -notcontains $Port
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
    $processId = Get-ListeningProcessId -Port $Port
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    return $response.StatusCode -eq 200 `
      -and $response.Content.Contains('/src/main.tsx') `
      -and $response.Content.Contains('id="root"') `
      -and $processInfo `
      -and $processInfo.CommandLine.Contains($ProjectDirectory)
  } catch {
    return $false
  }
}

function Get-ListeningProcessId {
  param([int]$Port)

  $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    return [int]$listener.OwningProcess
  }
  return $null
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

function New-ProcessRecord {
  param(
    [int]$ProcessId,
    [string]$Kind,
    [int]$Port
  )

  $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if (-not $process) {
    return $null
  }

  return [ordered]@{
    pid = $process.Id
    kind = $Kind
    port = $Port
    startTimeUtc = $process.StartTime.ToUniversalTime().ToString("o")
  }
}

function Wait-ForCondition {
  param(
    [scriptblock]$Condition,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    if (& $Condition) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  return $false
}

function Start-HiddenNodeProcess {
  param(
    [string]$NodePath,
    [string[]]$Arguments,
    [string]$OutputLog,
    [string]$ErrorLog
  )

  $startArguments = @{
    FilePath = $NodePath
    ArgumentList = $Arguments
    WorkingDirectory = $ProjectDirectory
    RedirectStandardOutput = $OutputLog
    RedirectStandardError = $ErrorLog
    WindowStyle = "Hidden"
    PassThru = $true
  }

  try {
    return Start-Process @startArguments
  } catch [System.ArgumentException] {
    # Some Windows sessions expose duplicate PATH keys to Start-Process.
    return Start-Process @startArguments -UseNewEnvironment
  }
}

function Show-LogTail {
  param([string]$Path)

  if (Test-Path -LiteralPath $Path) {
    Get-Content -LiteralPath $Path -Tail 20 | ForEach-Object { Write-Host $_ }
  }
}

try {
  Write-Host "===============================================" -ForegroundColor DarkBlue
  Write-Host " Fire Safety Inspection System - One Click Run " -ForegroundColor White
  Write-Host "===============================================" -ForegroundColor DarkBlue

  if (-not (Test-Path -LiteralPath (Join-Path $ProjectDirectory "package.json"))) {
    throw "package.json was not found in $ProjectDirectory"
  }

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    throw "Node.js was not found. Install Node.js and add node.exe to PATH."
  }

  $viteEntry = Join-Path $ProjectDirectory "node_modules\vite\bin\vite.js"
  $tsxEntry = Join-Path $ProjectDirectory "node_modules\tsx\dist\cli.mjs"
  if (-not (Test-Path -LiteralPath $viteEntry) -or -not (Test-Path -LiteralPath $tsxEntry)) {
    throw "Project dependencies are missing. Run npm install in $ProjectDirectory first."
  }

  New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null

  $backendOutputLog = Join-Path $RuntimeDirectory "backend-$Timestamp.out.log"
  $backendErrorLog = Join-Path $RuntimeDirectory "backend-$Timestamp.err.log"
  $frontendOutputLog = Join-Path $RuntimeDirectory "frontend-$Timestamp.out.log"
  $frontendErrorLog = Join-Path $RuntimeDirectory "frontend-$Timestamp.err.log"
  $backendProcessId = $null
  $frontendProcessId = $null

  if (Test-BackendHealth) {
    Write-Ok "Backend is already healthy on port 8080."
    $backendProcessId = Get-BackendRootProcessId
  } else {
    if (-not (Test-PortAvailable -Port 8080)) {
      throw "Port 8080 is occupied by another service and the expected health endpoint is unavailable."
    }

    Write-Step "Starting backend on port 8080..."
    $backendProcess = Start-HiddenNodeProcess `
      -NodePath $nodeCommand.Source `
      -Arguments @($tsxEntry, "watch", (Join-Path $ProjectDirectory "server\src\index.ts")) `
      -OutputLog $backendOutputLog `
      -ErrorLog $backendErrorLog

    if (-not (Wait-ForCondition -Condition { Test-BackendHealth } -TimeoutSeconds 30)) {
      Write-Host "Backend output:" -ForegroundColor Yellow
      Show-LogTail -Path $backendOutputLog
      Show-LogTail -Path $backendErrorLog
      throw "Backend did not become healthy. Process ID: $($backendProcess.Id)"
    }
    $backendProcessId = $backendProcess.Id
    Write-Ok "Backend started on port 8080. Process ID: $($backendProcess.Id)"
  }

  $frontendPort = $null
  $listeningPorts = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners().Port
  foreach ($port in $PreferredFrontendPort..$MaxFrontendPort) {
    if ($listeningPorts -contains $port -and (Test-FireSafetyFrontend -Port $port)) {
      $frontendPort = $port
      $frontendProcessId = Get-ListeningProcessId -Port $port
      Write-Ok "Frontend is already running on port $frontendPort."
      break
    }
  }

  if ($null -eq $frontendPort) {
    foreach ($port in $PreferredFrontendPort..$MaxFrontendPort) {
      if (Test-PortAvailable -Port $port) {
        $frontendPort = $port
        break
      }
    }

    if ($null -eq $frontendPort) {
      throw "No free frontend port was found between $PreferredFrontendPort and $MaxFrontendPort."
    }

    Write-Step "Starting frontend on port $frontendPort..."
    $frontendProcess = Start-HiddenNodeProcess `
      -NodePath $nodeCommand.Source `
      -Arguments @($viteEntry, "--host", "127.0.0.1", "--port", "$frontendPort", "--strictPort") `
      -OutputLog $frontendOutputLog `
      -ErrorLog $frontendErrorLog

    if (-not (Wait-ForCondition -Condition { Test-FireSafetyFrontend -Port $frontendPort } -TimeoutSeconds 30)) {
      Write-Host "Frontend output:" -ForegroundColor Yellow
      Show-LogTail -Path $frontendOutputLog
      Show-LogTail -Path $frontendErrorLog
      throw "Frontend did not become ready. Process ID: $($frontendProcess.Id)"
    }
    $frontendProcessId = $frontendProcess.Id
    Write-Ok "Frontend started on port $frontendPort. Process ID: $($frontendProcess.Id)"
  }

  $runState = [ordered]@{
    version = 1
    projectDirectory = $ProjectDirectory
    updatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    backend = if ($null -ne $backendProcessId) { New-ProcessRecord -ProcessId $backendProcessId -Kind "backend" -Port 8080 } else { $null }
    frontend = if ($null -ne $frontendProcessId) { New-ProcessRecord -ProcessId $frontendProcessId -Kind "frontend" -Port $frontendPort } else { $null }
  }
  $runState | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StateFile -Encoding UTF8

  $systemUrl = "http://127.0.0.1:$frontendPort/"
  $helmetUrl = "http://127.0.0.1:$frontendPort/helmet-live"

  Write-Host ""
  Write-Ok "System is ready."
  Write-Host "System URL : $systemUrl" -ForegroundColor White
  Write-Host "Helmet URL : $helmetUrl" -ForegroundColor White
  Write-Host "Backend    : http://127.0.0.1:8080/api/health" -ForegroundColor White
  Write-Host "Log folder : $RuntimeDirectory" -ForegroundColor DarkGray

  if (-not $NoBrowser) {
    Start-Process -FilePath $systemUrl | Out-Null
  }

  exit 0
} catch {
  Write-Host ""
  Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

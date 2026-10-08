Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$RuntimeDirectory = Join-Path ([IO.Path]::GetTempPath()) "fire-safety-inspection-system"
$StateFile = Join-Path $RuntimeDirectory "state.json"
$ViteEntry = Join-Path $ProjectDirectory "node_modules\vite\bin\vite.js"
$TsxEntry = Join-Path $ProjectDirectory "node_modules\tsx\dist\cli.mjs"
$BackendEntry = Join-Path $ProjectDirectory "server\src\index.ts"
$Services = @(
  [pscustomobject]@{ kind = "backend"; port = 8080; path = "/api/health"; marker = "" },
  [pscustomobject]@{ kind = "current"; port = 5187; path = "/"; marker = "/@vite/client" },
  [pscustomobject]@{ kind = "demo"; port = 5186; path = "/theme-prototype.html"; marker = "/src/design/theme-prototype-main.tsx" }
)

function Enter-ServiceLock {
  New-Item -ItemType Directory -Path $RuntimeDirectory -Force | Out-Null
  try {
    return [IO.File]::Open((Join-Path $RuntimeDirectory "service.lock"), 'OpenOrCreate', 'ReadWrite', 'None')
  } catch {
    throw "Another start/stop operation is running. Please wait for it to finish."
  }
}

function Get-ListeningProcessId {
  param([int]$Port)
  $listener = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) { return [int]$listener.OwningProcess }
  return $null
}

function Test-ServiceProcess {
  param([object]$ProcessInfo, [object]$Service)
  if (-not $ProcessInfo -or $ProcessInfo.Name -ne "node.exe" -or -not $ProcessInfo.CommandLine) { return $false }
  $commandLine = $ProcessInfo.CommandLine.Replace('/', '\')
  if ($Service.kind -eq "backend") {
    $tsxDirectory = Join-Path $ProjectDirectory "node_modules\tsx\"
    return $commandLine -match [regex]::Escape($tsxDirectory) -and $commandLine -match ([regex]::Escape($BackendEntry) + '(?:"|\s|$)')
  }
  return $commandLine -match [regex]::Escape($ViteEntry) -and $commandLine -match ('--port\s+"?' + $Service.port + '"?(?:\s|$)')
}

function Get-OwnedServiceProcess {
  param([object]$Service)
  $processId = Get-ListeningProcessId -Port $Service.port
  if ($null -eq $processId) { return $null }
  $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
  if (-not (Test-ServiceProcess -ProcessInfo $owner -Service $Service)) { return $null }
  # Stop/reuse the tsx watcher as well as its HTTP server child.
  if ($Service.kind -eq "backend") {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($owner.ParentProcessId)" -ErrorAction SilentlyContinue
    if (Test-ServiceProcess -ProcessInfo $parent -Service $Service) { return $parent }
  }
  return $owner
}

function New-ServiceRecord {
  param([int]$ProcessId, [object]$Service)
  $process = Get-Process -Id $ProcessId -ErrorAction Stop
  return [pscustomobject]@{
    pid = $process.Id
    kind = $Service.kind
    port = $Service.port
    startTimeUtc = $process.StartTime.ToUniversalTime().ToString("o")
  }
}

function Test-ServiceRecord {
  param([object]$Record, [object]$Service)
  try {
    if (-not $Record -or [int]$Record.port -ne $Service.port) { return $false }
    $process = Get-Process -Id ([int]$Record.pid) -ErrorAction Stop
    $expectedStart = [DateTime]::Parse([string]$Record.startTimeUtc).ToUniversalTime()
    if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $expectedStart).TotalMilliseconds) -gt 10) { return $false }
    $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($process.Id)" -ErrorAction Stop
    return Test-ServiceProcess -ProcessInfo $processInfo -Service $Service
  } catch { return $false }
}

function Read-ServiceRecords {
  if (-not (Test-Path -LiteralPath $StateFile)) { return @() }
  try {
    $state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
    if ($state.projectDirectory -ne $ProjectDirectory) { return @() }
    if ($state.PSObject.Properties.Name -contains "services") { return @($state.services) }
    # Accept records created by the previous single-frontend launcher.
    return @($state.backend, $state.frontend) | Where-Object { $null -ne $_ }
  } catch {
    Write-Host "[WARN] Saved state is invalid; discovering services by project path." -ForegroundColor Yellow
    return @()
  }
}

function Save-ServiceRecords {
  param([object[]]$Records, [string]$Status)
  [ordered]@{
    version = 2
    projectDirectory = $ProjectDirectory
    updatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    status = $Status
    services = @($Records)
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $StateFile -Encoding UTF8
}

function Test-ServiceHealth {
  param([object]$Service)
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$($Service.port)$($Service.path)" -TimeoutSec 2
    if ($response.StatusCode -ne 200) { return $false }
    if ($Service.kind -eq "backend") { return ($response.Content | ConvertFrom-Json).success -eq $true }
    return $response.Content.Contains($Service.marker) -and $response.Content.Contains('id="root"')
  } catch { return $false }
}

function Wait-ServiceHealth {
  param([object]$Service)
  $deadline = (Get-Date).AddSeconds(30)
  do {
    if (Test-ServiceHealth -Service $Service) { return $true }
    Start-Sleep -Milliseconds 400
  } while ((Get-Date) -lt $deadline)
  return $false
}

function Start-HiddenService {
  param([string]$NodePath, [object]$Service, [string]$OutputLog, [string]$ErrorLog)
  if ($Service.kind -eq "backend") {
    $arguments = '"{0}" watch "{1}"' -f $TsxEntry, $BackendEntry
  } else {
    $arguments = '"{0}" --host 127.0.0.1 --port {1} --strictPort' -f $ViteEntry, $Service.port
  }
  $startArguments = @{
    FilePath = $NodePath
    ArgumentList = $arguments
    WorkingDirectory = $ProjectDirectory
    RedirectStandardOutput = $OutputLog
    RedirectStandardError = $ErrorLog
    WindowStyle = "Hidden"
    PassThru = $true
  }
  return Start-Process @startArguments
}

function Stop-OwnedService {
  param([object]$Record, [object]$Service)
  if (-not (Test-ServiceRecord -Record $Record -Service $Service)) { return }
  $result = & taskkill.exe /PID $Record.pid /T /F 2>&1
  if ($LASTEXITCODE -ne 0 -and (Test-ServiceRecord -Record $Record -Service $Service)) {
    throw "Unable to stop $($Service.kind) process $($Record.pid): $($result -join ' ')"
  }
  Write-Host "[OK] Stopped $($Service.kind) on port $($Service.port). PID: $($Record.pid)" -ForegroundColor Green
}

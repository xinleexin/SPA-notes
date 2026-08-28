# ============================================
# Start HTTP Server for SPA Chess Game
# Idempotent: stops any existing instance first,
# then starts a fresh one and opens the browser.
# ============================================

$Port    = 8000
$Root    = $PSScriptRoot
$PidFile = Join-Path $Root ".http-server.pid"

function Test-PortInUse([int]$p) {
    [bool](Get-NetTCPConnection -LocalPort $p -State Listen -EA SilentlyContinue)
}

function Find-ServerInstance {
    # 1) PID file (most precise)
    if (Test-Path $PidFile) {
        $id = (Get-Content $PidFile -Raw).Trim()
        if ($id -match '^\d+$') {
            $p = Get-Process -Id $id -EA SilentlyContinue
            if ($p -and $p.Name -in @('python', 'pythonw')) { return $p }
        }
        Remove-Item $PidFile -EA SilentlyContinue   # stale file
    }
    # 2) Command-line fingerprint (robust to a missing PID file)
    Get-CimInstance Win32_Process -Filter "Name='python.exe'" -EA SilentlyContinue |
        Where-Object { $_.CommandLine -match ("http\.server\s+{0}\s*$" -f $Port) } |
        ForEach-Object { Get-Process -Id $_.ProcessId -EA SilentlyContinue } |
        Select-Object -First 1
}

function Stop-ServerInstance($proc) {
    if ($null -eq $proc) { return }
    Stop-Process -Id $proc.Id -Force -EA SilentlyContinue
}

# --- Preflight ----------------------------------------------------------
if (-not (Get-Command python -EA SilentlyContinue)) {
    Write-Error "python not found on PATH. Install it and re-run."
    exit 1
}
Set-Location $Root

# --- If already running, stop it ----------------------------------------
$existing = Find-ServerInstance
if ($existing) {
    Write-Host "Server already running (PID $($existing.Id)). Stopping it..." -ForegroundColor Yellow
    Stop-ServerInstance $existing
    Start-Sleep -Seconds 1
}
elseif (Test-PortInUse $Port) {
    $owner = (Get-NetTCPConnection -LocalPort $Port -State Listen).OwningProcess | Select-Object -First 1
    Write-Warning "Port $Port is in use by PID $owner (not our server). Free the port or change it."
    exit 1
}

# --- Start fresh --------------------------------------------------------
Write-Host "Starting HTTP server on port $Port..." -ForegroundColor Green
$proc = Start-Process python -ArgumentList "-m", "http.server", "$Port" `
        -WorkingDirectory $Root -WindowStyle Hidden -PassThru
$proc.Id | Set-Content -Path $PidFile -NoNewline

# Wait until it actually accepts connections
$ready = $false
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 300
    if (Test-PortInUse $Port) { $ready = $true; break }
}
if (-not $ready) {
    Write-Warning "Server did not come up on port $Port in time."
    Stop-ServerInstance $proc
    Remove-Item $PidFile -EA SilentlyContinue
    exit 1
}

$Url = "http://localhost:$Port/chess.html"
Write-Host "HTTP server running at $Url (PID $($proc.Id)). Press any key to stop." -ForegroundColor Cyan
Start-Process $Url                                    # open the browser (matches docs)

# --- Wait for key, then clean stop --------------------------------------
$null = $Host.UI.RawUI.ReadKey("NoEcho, IncludeKeyDown")
Stop-ServerInstance $proc
Remove-Item $PidFile -EA SilentlyContinue
Write-Host "Server stopped." -ForegroundColor Yellow

# ============================================
# Start HTTP Server for SPA Chess Game
# ============================================

Write-Host "Starting HTTP server on port 8000..." -ForegroundColor Green

# Change to the current directory (SPA-notes)
Set-Location $PSScriptRoot

# Start Python HTTP server in background
Start-Process -WindowStyle Hidden powershell -ArgumentList "-NoExit", "-Command", "python -m http.server 8000"

# Wait a moment for server to start
Start-Sleep -Seconds 2

# Open browser to the chess page
Write-Host "Opening browser to http://localhost:8000/chess.html" -ForegroundColor Green
Start-Process "http://localhost:8000/chess.html"

Write-Host "HTTP server started on port 8000. Press any key to stop the server." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop all Python HTTP servers when closing
Get-Process | Where-Object { $_.ProcessName -eq "python" } | Stop-Process -Force

Write-Host "Server stopped." -ForegroundColor Yellow
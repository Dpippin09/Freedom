Write-Host "Starting Aced Fashion Development Server..." -ForegroundColor Green
Write-Host "Server URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Set-Location "c:\Users\dpipp\freedom\freedom"
node server.js

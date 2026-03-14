@echo off
cd /d "%~dp0"

echo Starting backend...
start "Jagiris Backend" cmd /k "cd /d "%~dp0backend" && npm start"

timeout /t 3 /nobreak >nul

echo Starting frontend...
start "Jagiris Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend and frontend started in separate windows.
echo Close those windows to stop the servers.
pause

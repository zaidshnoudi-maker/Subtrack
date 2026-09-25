@echo off
title SubTrack
cd /d "%~dp0"
echo ==== SubTrack setup %date% %time% ==== > setup-log.txt
echo Folder: %cd% >> setup-log.txt

echo [1/4] Checking Node.js...
where node >> setup-log.txt 2>&1
if errorlevel 1 (
  echo NODE_NOT_INSTALLED >> setup-log.txt
  echo.
  echo Node.js is not installed. Opening the download page...
  echo Install the LTS version, then double-click start.bat again.
  start "" https://nodejs.org
  pause
  exit /b 1
)
node -v >> setup-log.txt 2>&1
call npm -v >> setup-log.txt 2>&1

if not exist node_modules\next (
  echo [2/4] Installing packages - first time takes 2-5 minutes...
  call npm install --no-audit --no-fund >> setup-log.txt 2>&1
  if errorlevel 1 (
    echo INSTALL_FAILED >> setup-log.txt
    echo.
    echo Install failed. Tell Claude "check the log".
    pause
    exit /b 1
  )
) else (
  echo [2/4] Packages already installed.
)

call npm run setup:env >> setup-log.txt 2>&1

echo [3/4] Running tests...
call npm test >> setup-log.txt 2>&1

echo Stopping any old SubTrack server...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*Sub Tracker*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 >nul

echo [4/4] Starting the app. Keep this window open.
echo       First start can take up to 2 minutes. Your browser opens http://localhost:3100/demo when ready.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 120;$i++){ try { Invoke-WebRequest http://localhost:3100/demo -UseBasicParsing -TimeoutSec 60 | Out-Null; break } catch { Start-Sleep 3 } }; Start-Process http://localhost:3100/demo"
powershell -NoProfile -Command "npm run dev 2>&1 | Tee-Object -FilePath dev-log.txt"
echo DEV_SERVER_STOPPED >> dev-log.txt
echo.
echo The app stopped. Tell Claude "check the log".
pause

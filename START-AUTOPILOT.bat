@echo off
title AutoPilot Marketing OS
rem ============================================================
rem  Double-click me. I start the app and open your browser.
rem  Keep the window that opens - closing it stops the app.
rem ============================================================

if not exist "D:\ai-marketing-automation\web\package.json" (
  echo.
  echo  [PROBLEM] I can't find the app at D:\ai-marketing-automation\web
  echo  If you unzipped it somewhere else: right-click this file,
  echo  pick Edit, and change the D:\ path on the cd line, save, run again.
  echo.
  pause
  exit /b 1
)

cd /d "D:\ai-marketing-automation\web"

if not exist ".env" (
  echo  One-time setup: creating .env from env.example.txt ...
  copy /y env.example.txt .env >nul
)

if not exist "node_modules" (
  echo.
  echo  First run: installing building blocks. 2-5 minutes, just wait.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  [PROBLEM] npm install failed - read the last red lines above.
    echo  If it says "npm not recognized": reinstall Node.js from nodejs.org,
    echo  keep "Add to PATH" ticked, close this window, run me again.
    echo.
    pause
    exit /b 1
  )
)

if not exist "prisma\dev.db" (
  echo  One-time setup: creating demo database ...
  call npm run db:push
  call npm run db:seed
)

echo.
echo  ================================================================
echo    AUTOPILOT MARKETING OS  -  starting ...
echo  ================================================================
echo    Login: demo@apexroofing.com  /  demo1234
echo.
echo    1. Wait for the line:  Local: http://localhost:3000
echo    2. Your browser opens by itself in about 12 seconds
echo       - if it says "refused to connect", just refresh after
echo         you see Local: http://localhost:3000 above
echo    3. KEEP THIS WINDOW OPEN - closing it turns the app off
echo    4. To stop the app: click here and press Ctrl+C
echo  ================================================================
echo.
start "" cmd /c "timeout /t 12 /nobreak >nul & start http://localhost:3000"
call npm run dev
echo.
echo  [SERVER STOPPED] You can close this window now.
pause

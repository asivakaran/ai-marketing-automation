@echo off
title AutoPilot - Add a Client
rem ============================================================
rem  Double-click me. I add a new client (their own branded
rem  dashboard + chat widget) and print their login + widget link.
rem  Keep START-AUTOPILOT running in its own window - this works
rem  alongside it.
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
echo    ADD A NEW CLIENT
echo  ================================================================
echo.
set /p CLIENTNAME=Type the business name (e.g. WD Roofing): 
if "%CLIENTNAME%"=="" (
  echo.
  echo  [STOPPED] You didn't type a name. Run me again.
  echo.
  pause
  exit /b 1
)
echo.

:getemail
set CLIENTEMAIL=
set /p CLIENTEMAIL=Their email - this becomes their LOGIN USERNAME (e.g. info@wdroofing.org). Enter to skip: 
if "%CLIENTEMAIL%"=="" goto :create
echo %CLIENTEMAIL% | find /i "@" >nul
if errorlevel 1 (
  echo.
  echo  [CHECK] That has no @ in it. Type the full email address,
  echo  or press Enter alone to skip the email.
  echo.
  goto :getemail
)

:create
echo.
echo  Creating %CLIENTNAME% ... takes about 10 seconds.
echo  (If you skipped the email, their login username will be a
    placeholder like owner@wdroofing.local - that is normal.)
echo.

if "%CLIENTEMAIL%"=="" (
  call npx tsx prisma/new-client.ts "%CLIENTNAME%"
) else (
  call npx tsx prisma/new-client.ts "%CLIENTNAME%" "%CLIENTEMAIL%"
)

echo.
echo  ================================================================
echo  Read the box above: it has THEIR login and THEIR widget link.
echo  The email is just a login username - no inbox is needed for it.
echo  Screenshot the box or copy it out now - then press any key.
echo  ================================================================
pause >nul

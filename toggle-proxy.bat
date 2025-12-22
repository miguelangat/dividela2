@echo off
REM Toggle NPM Proxy for Dividela Project
REM Usage: toggle-proxy.bat [on|off|status]

set NPMRC_FILE=.npmrc
set PROXY_URL=http://localhost:8081

if "%1"=="on" goto enable
if "%1"=="enable" goto enable
if "%1"=="off" goto disable
if "%1"=="disable" goto disable
if "%1"=="status" goto status
if "%1"=="" goto status

echo Usage: %0 [on^|off^|status]
echo.
echo Commands:
echo   on      - Enable proxy (%PROXY_URL%)
echo   off     - Disable proxy
echo   status  - Show current proxy status (default)
exit /b 1

:enable
call npm config set proxy %PROXY_URL% --userconfig %NPMRC_FILE%
call npm config set https-proxy %PROXY_URL% --userconfig %NPMRC_FILE%
call npm config set strict-ssl false --userconfig %NPMRC_FILE%
echo ✅ Proxy enabled: %PROXY_URL%
goto end

:disable
call npm config delete proxy --userconfig %NPMRC_FILE% 2>nul
call npm config delete https-proxy --userconfig %NPMRC_FILE% 2>nul
echo ✅ Proxy disabled
goto end

:status
findstr /B "proxy=" %NPMRC_FILE% >nul 2>&1
if %ERRORLEVEL%==0 (
    echo 📡 Proxy is currently: ENABLED
    findstr /B "proxy=" %NPMRC_FILE%
    findstr /B "https-proxy=" %NPMRC_FILE%
) else (
    echo 📡 Proxy is currently: DISABLED
)
goto end

:end

@echo off
setlocal
cd /d "%~dp0"

set "PORT=8000"
if not "%~1"=="" set "PORT=%~1"
set "URL=http://localhost:%PORT%/portail_3d_page_d_accueil_interactive.html"

echo Starting local server at %URL%
echo Press Ctrl+C to stop.

start "" "%URL%"

where py >nul 2>&1
if %errorlevel%==0 (
    py -m http.server %PORT%
    goto :eof
)

where python >nul 2>&1
if %errorlevel%==0 (
    python -m http.server %PORT%
    goto :eof
)

where php >nul 2>&1
if %errorlevel%==0 (
    php -S localhost:%PORT%
    goto :eof
)

where npx >nul 2>&1
if %errorlevel%==0 (
    npx --yes serve -l %PORT% .
    goto :eof
)

echo Error: No HTTP server found (install Python, PHP, or Node.js).
pause
exit /b 1

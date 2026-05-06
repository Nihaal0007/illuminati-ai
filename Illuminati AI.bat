@echo off
REM Launch the Illuminati AI local server and open the site in the default browser.
REM Keeps the server running in a visible window — close it to stop.

set ROOT=%~dp0
start "" "%ROOT%serve.ps1.cmd"
timeout /t 2 /nobreak >nul
start "" "http://localhost:8001/"
exit

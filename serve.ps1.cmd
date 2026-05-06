@echo off
REM Wrapper so the .bat launcher can start the PowerShell server in a normal window
powershell -ExecutionPolicy Bypass -NoExit -File "%~dp0serve.ps1"

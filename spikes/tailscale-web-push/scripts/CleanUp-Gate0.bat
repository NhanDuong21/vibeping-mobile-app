@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CleanUp-Gate0.ps1" %*

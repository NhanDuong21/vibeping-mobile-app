@echo off
chcp 65001 >nul
setlocal
"%~dp0vibeping.exe" open
exit /b %errorlevel%

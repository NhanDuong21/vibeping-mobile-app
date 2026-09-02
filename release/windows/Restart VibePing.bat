@echo off
chcp 65001 >nul
setlocal
echo Đang khởi động lại VibePing an toàn...
"%~dp0vibeping.exe" restart --port 8787
if errorlevel 1 exit /b %errorlevel%
"%~dp0vibeping.exe" status
if errorlevel 1 exit /b %errorlevel%
"%~dp0vibeping.exe" doctor
exit /b %errorlevel%

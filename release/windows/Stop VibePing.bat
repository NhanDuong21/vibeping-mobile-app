@echo off
chcp 65001 >nul
setlocal
echo Đang dừng VibePing an toàn...
"%~dp0vibeping.exe" stop
exit /b %errorlevel%

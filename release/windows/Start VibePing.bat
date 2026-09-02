@echo off
chcp 65001 >nul
setlocal
echo Đang khởi động VibePing...
"%~dp0vibeping.exe" start --port 8787
if errorlevel 1 exit /b %errorlevel%
"%~dp0vibeping.exe" status
if errorlevel 1 exit /b %errorlevel%
"%~dp0vibeping.exe" doctor
if errorlevel 1 exit /b %errorlevel%
echo.
echo VibePing đang chạy ở nền. Cửa sổ này sẽ đóng sau 15 giây.
timeout /t 15 /nobreak >nul
exit /b 0

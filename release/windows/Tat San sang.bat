@echo off
chcp 65001 >nul
setlocal
"%~dp0vibeping.exe" always-ready disable --port 8787
if errorlevel 1 goto failed
echo Đã tắt Sẵn sàng. Muốn dừng máy chủ, hãy mở Stop VibePing.bat.
timeout /t 15 /nobreak >nul
exit /b 0
:failed
echo Chưa tắt được. Xem thông báo phía trên rồi thử lại.
pause
exit /b 1

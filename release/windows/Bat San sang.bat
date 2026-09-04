@echo off
chcp 65001 >nul
setlocal
echo Đang bật Sẵn sàng trên Windows...
"%~dp0vibeping.exe" always-ready enable --port 8787
if errorlevel 1 goto failed
echo Khay VibePing đang chạy. Bạn có thể tìm mèo trong nhóm biểu tượng ẩn.
echo VibePing sẽ khởi động khi bạn đăng nhập Windows.
timeout /t 15 /nobreak >nul
exit /b 0
:failed
echo Chưa bật được. Xem thông báo phía trên rồi thử lại.
pause
exit /b 1

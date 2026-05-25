@echo off
chcp 65001 > nul
echo ==========================================================
echo   ĐANG BIÊN DỊCH VÀ KHỞI CHẠY HỆ THỐNG THU PHÍ (JAVA)...
echo ==========================================================
echo.

rem Tạo thư mục bin nếu chưa tồn tại
if not exist bin mkdir bin

rem 1. Biên dịch toàn bộ các file Java
echo [+] Bước 1: Tiến hành biên dịch các lớp Java (javac)...
javac -encoding UTF-8 -d bin src/com/fee/system/models/*.java src/com/fee/system/services/*.java src/com/fee/system/config/*.java src/com/fee/system/web/*.java src/com/fee/system/Main.java

if %errorlevel% neq 0 (
    echo.
    echo [!] LỖI: Biên dịch thất bại! 
    echo Vui lòng đảm bảo bạn đã cài đặt JDK (Java Development Kit) và thiết lập PATH.
    echo (Kiểm tra bằng cách gõ lệnh 'javac -version' trong CMD).
    echo.
    pause
    exit /b %errorlevel%
)

echo [+] Biên dịch thành công! Dữ liệu lớp (.class) đã được lưu vào thư mục 'bin'.
echo.

rem 2. Khởi chạy lớp Main
echo [+] Bước 2: Khởi chạy chương trình (java com.fee.system.Main)...
echo ----------------------------------------------------------
java "-Dfile.encoding=UTF-8" -cp bin com.fee.system.Main

echo.
echo ==========================================================
echo   CHƯƠNG TRÌNH ĐÃ THỰC THI XONG.
echo ==========================================================
pause

@echo off
setlocal enabledelayedexpansion

echo ========================================
echo    Support System - Docker Manager
echo ========================================
echo.

:menu
echo Chon hanh dong:
echo 1. Build va chay toan bo (lan dau)
echo 2. Chay services (da build)
echo 3. Dung tat ca services
echo 4. Restart tat ca services
echo 5. Xem logs
echo 6. Xem status containers
echo 7. Tao SSL certificate
echo 8. Clean up (xoa containers, images)
echo 9. Backup database
echo 10. Restore database
echo 0. Thoat
echo.

set /p choice="Nhap lua chon (0-10): "

if "%choice%"=="1" goto build_and_run
if "%choice%"=="2" goto run
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto status
if "%choice%"=="7" goto ssl
if "%choice%"=="8" goto cleanup
if "%choice%"=="9" goto backup
if "%choice%"=="10" goto restore
if "%choice%"=="0" goto exit
goto menu

:build_and_run
echo.
echo [1] Dang build va chay toan bo services...
echo.
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi build/run services
    pause
    goto menu
)
echo [SUCCESS] Tat ca services da duoc build va chay thanh cong!
echo.
echo Truy cap ung dung:
echo - Frontend: https://localhost
echo - Backend API: https://localhost/api/
echo - Database: localhost:3306
echo.
echo Tai khoan mac dinh:
echo - Email: admin@example.com
echo - Password: admin123
echo.
pause
goto menu

:run
echo.
echo [2] Dang chay services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi chay services
    pause
    goto menu
)
echo [SUCCESS] Services da duoc chay thanh cong!
pause
goto menu

:stop
echo.
echo [3] Dang dung tat ca services...
docker-compose down
if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi dung services
    pause
    goto menu
)
echo [SUCCESS] Tat ca services da duoc dung!
pause
goto menu

:restart
echo.
echo [4] Dang restart tat ca services...
docker-compose restart
if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi restart services
    pause
    goto menu
)
echo [SUCCESS] Tat ca services da duoc restart!
pause
goto menu

:logs
echo.
echo [5] Xem logs cua services...
echo.
echo Chon service de xem logs:
echo 1. Backend
echo 2. Frontend
echo 3. MySQL
echo 4. Nginx
echo 5. Tat ca
echo 6. Quay lai menu chinh
echo.
set /p log_choice="Nhap lua chon (1-6): "

if "%log_choice%"=="1" (
    echo [LOGS] Backend logs:
    docker-compose logs -f backend
) else if "%log_choice%"=="2" (
    echo [LOGS] Frontend logs:
    docker-compose logs -f frontend
) else if "%log_choice%"=="3" (
    echo [LOGS] MySQL logs:
    docker-compose logs -f mysql
) else if "%log_choice%"=="4" (
    echo [LOGS] Nginx logs:
    docker-compose logs -f nginx
) else if "%log_choice%"=="5" (
    echo [LOGS] Tat ca logs:
    docker-compose logs -f
) else if "%log_choice%"=="6" (
    goto menu
) else (
    echo Lua chon khong hop le!
    pause
    goto logs
)
goto menu

:status
echo.
echo [6] Trang thai containers:
docker-compose ps
echo.
echo [INFO] Chi tiet containers:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
pause
goto menu

:ssl
echo.
echo [7] Tao SSL certificate...
echo.

REM Kiem tra xem co OpenSSL khong
openssl version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] OpenSSL khong duoc cai dat!
    echo Vui long cai dat OpenSSL truoc khi chay script nay.
    echo.
    echo Cach cai dat OpenSSL tren Windows:
    echo 1. Tai tu: https://slproweb.com/products/Win32OpenSSL.html
    echo 2. Hoac su dung Chocolatey: choco install openssl
    echo 3. Hoac su dung WSL: sudo apt-get install openssl
    echo.
    pause
    goto menu
)

REM Tao thu muc nginx/ssl neu chua co
if not exist "nginx\ssl" (
    mkdir "nginx\ssl"
    echo [INFO] Da tao thu muc nginx\ssl
)

REM Tao SSL certificate
echo [INFO] Dang tao SSL certificate...
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx\ssl\key.pem -out nginx\ssl\cert.pem -subj "/C=VN/ST=Hanoi/L=Hanoi/O=SupportSystem/OU=IT/CN=localhost"

if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi tao SSL certificate!
    pause
    goto menu
)

echo [SUCCESS] SSL certificate da duoc tao thanh cong!
echo Certificate: nginx\ssl\cert.pem
echo Private key: nginx\ssl\key.pem
echo.
echo [NOTE] Day la self-signed certificate cho development.
echo De production, hay su dung certificate tu CA uy tin.
echo.
pause
goto menu

:cleanup
echo.
echo [8] Clean up Docker resources...
echo.
echo Canh bao: Hanh dong nay se xoa:
echo - Tat ca containers
echo - Tat ca images
echo - Tat ca volumes (bao gom database data)
echo.
set /p confirm="Ban co chac chan muon tiep tuc? (y/N): "
if /i not "%confirm%"=="y" goto menu

echo [INFO] Dang dung va xoa containers...
docker-compose down -v

echo [INFO] Dang xoa images...
docker system prune -a -f

echo [INFO] Dang xoa volumes...
docker volume prune -f

echo [SUCCESS] Clean up hoan tat!
echo [NOTE] Ban can chay lai lua chon 1 de build va chay lai.
pause
goto menu

:backup
echo.
echo [9] Backup database...
echo.
set /p backup_name="Nhap ten file backup (mac dinh: backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql): "
if "%backup_name%"=="" (
    set backup_name=backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.sql
    set backup_name=!backup_name: =0!
)

echo [INFO] Dang backup database...
docker-compose exec -T mysql mysqldump -u docker1 -p123456 support_system > "!backup_name!"

if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi backup database!
    pause
    goto menu
)

echo [SUCCESS] Database da duoc backup thanh cong!
echo File backup: !backup_name!
pause
goto menu

:restore
echo.
echo [10] Restore database...
echo.
echo Cac file backup co san:
dir *.sql 2>nul | findstr /i "backup"
echo.
set /p restore_file="Nhap ten file backup de restore: "
if "%restore_file%"=="" (
    echo [ERROR] Ten file khong duoc de trong!
    pause
    goto restore
)

if not exist "!restore_file!" (
    echo [ERROR] File !restore_file! khong ton tai!
    pause
    goto restore
)

echo [WARNING] Hanh dong nay se ghi de du lieu hien tai!
set /p confirm="Ban co chac chan muon restore? (y/N): "
if /i not "%confirm%"=="y" goto menu

echo [INFO] Dang restore database...
docker-compose exec -T mysql mysql -u docker1 -p123456 support_system < "!restore_file!"

if %errorlevel% neq 0 (
    echo [ERROR] Co loi khi restore database!
    pause
    goto menu
)

echo [SUCCESS] Database da duoc restore thanh cong!
pause
goto menu

:exit
echo.
echo Cam on ban da su dung Support System Docker Manager!
echo.
exit /b 0 
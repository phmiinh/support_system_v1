@echo off
echo ========================================
echo    Fix MySQL Port Conflict
echo ========================================
echo.

echo [INFO] Kiem tra MySQL local...
netstat -an | findstr :3306

echo.
echo [INFO] Dang dung MySQL local (neu co)...
net stop mysql 2>nul
net stop mysql80 2>nul
net stop mysql57 2>nul
net stop mysql56 2>nul

echo.
echo [INFO] Dang dung XAMPP MySQL (neu co)...
net stop mysql 2>nul

echo.
echo [INFO] Dang dung WAMP MySQL (neu co)...
net stop wampmysqld 2>nul

echo.
echo [INFO] Kiem tra lai port 3306...
netstat -an | findstr :3306

if %errorlevel% equ 0 (
    echo [WARNING] Port 3306 van con duoc su dung!
    echo.
    echo Cach giai quyet:
    echo 1. Dung MySQL local trong Task Manager
    echo 2. Hoac thay doi port trong docker-compose.yml
    echo.
    pause
) else (
    echo [SUCCESS] Port 3306 da duoc giai phong!
    echo.
    echo Bay gio ban co the chay lai:
    echo run-docker.bat
    echo.
)

pause 
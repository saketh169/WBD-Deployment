@echo off
REM ==========================================
REM Redis & MongoDB Benchmark - Quick Setup
REM ==========================================

setlocal enabledelayedexpansion

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║      REDIS ^& MONGODB BENCHMARK - SETUP HELPER             ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker first.
    echo    https://docs.docker.com/desktop/install/windows/
    pause
    exit /b 1
)

echo ✅ Docker is available
echo.
echo Select benchmark scenario:
echo 1) Local Redis only (Docker)
echo 2) Local Redis + Redis Cloud
echo 3) All three (Local Redis + Redis Cloud + MongoDB Atlas)
echo 4) Just run benchmark (assuming .env is configured)
echo.

set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto scenario1
if "%choice%"=="2" goto scenario2
if "%choice%"=="3" goto scenario3
if "%choice%"=="4" goto scenario4
echo ❌ Invalid choice
pause
exit /b 1

:scenario1
echo.
echo 🚀 Starting Local Redis (Docker)...
echo.

REM Check if redis container already exists
docker ps -a | find "redis-bench" >nul 2>&1
if not errorlevel 1 (
    echo    Removing existing redis-bench container...
    docker stop redis-bench >nul 2>&1
    docker rm redis-bench >nul 2>&1
)

REM Start Redis
docker run -d --name redis-bench -p 6379:6379 redis:7-alpine
if errorlevel 1 (
    echo ❌ Failed to start Redis container
    pause
    exit /b 1
)

echo ✅ Redis started on localhost:6379
echo.
timeout /t 2 /nobreak
echo Running benchmark...
echo.
call npm run benchmark:redis

echo.
echo 🧹 Cleaning up...
docker stop redis-bench >nul 2>&1
docker rm redis-bench >nul 2>&1
echo ✅ Done!
pause
goto end

:scenario2
echo.
echo ⚠️  Make sure you have updated .env with REDIS_CLOUD_URL
pause

echo 🚀 Starting Local Redis (Docker)...
echo.

docker ps -a | find "redis-bench" >nul 2>&1
if not errorlevel 1 (
    docker stop redis-bench >nul 2>&1
    docker rm redis-bench >nul 2>&1
)

docker run -d --name redis-bench -p 6379:6379 redis:7-alpine
if errorlevel 1 (
    echo ❌ Failed to start Redis container
    pause
    exit /b 1
)

echo ✅ Redis started on localhost:6379
echo.
timeout /t 2 /nobreak
echo Running benchmark...
echo.
call npm run benchmark:redis

echo.
echo 🧹 Cleaning up...
docker stop redis-bench >nul 2>&1
docker rm redis-bench >nul 2>&1
echo ✅ Done!
pause
goto end

:scenario3
echo.
echo ⚠️  Make sure you have updated .env with ALL:
echo    - REDIS_LOCAL_HOST and REDIS_LOCAL_PORT
echo    - REDIS_CLOUD_URL
echo    - MONGODB_URL or MONGODB_ATLAS_URL
pause

echo 🚀 Starting Local Redis (Docker)...
echo.

docker ps -a | find "redis-bench" >nul 2>&1
if not errorlevel 1 (
    docker stop redis-bench >nul 2>&1
    docker rm redis-bench >nul 2>&1
)

docker run -d --name redis-bench -p 6379:6379 redis:7-alpine
if errorlevel 1 (
    echo ❌ Failed to start Redis container
    pause
    exit /b 1
)

echo ✅ Redis started on localhost:6379
echo.
timeout /t 2 /nobreak
echo Running benchmark...
echo.
call npm run benchmark:redis

echo.
echo 🧹 Cleaning up...
docker stop redis-bench >nul 2>&1
docker rm redis-bench >nul 2>&1
echo ✅ Done!
pause
goto end

:scenario4
echo.
echo Running benchmark...
echo.
call npm run benchmark:redis
pause
goto end

:end
echo.
echo ✅ Check backend\logs\ folder for detailed reports.
pause

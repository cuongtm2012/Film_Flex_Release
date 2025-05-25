@echo off
setlocal EnableDelayedExpansion

echo Setting PostgreSQL path...
set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin

echo Checking PostgreSQL status...
pg_isready -h localhost -p 5432
if errorlevel 1 (
    echo PostgreSQL is not running!
    echo Please start PostgreSQL using these steps:
    echo 1. Press Windows + R
    echo 2. Type 'services.msc' and press Enter
    echo 3. Find 'postgresql-x64-17'
    echo 4. Right-click and select 'Start'
    echo.
    echo After starting PostgreSQL, run this script again.
    pause
    exit /b 1
)

echo PostgreSQL is running. Continuing with setup...

echo Setting environment variables...
set NODE_ENV=development
set DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
set SESSION_SECRET=local_development_secret
set PORT=3000
set DEBUG=*

echo Testing database connection...
psql -U postgres -c "\l" -w
if errorlevel 1 (
    echo Database connection failed! Please check your PostgreSQL password.
    pause
    exit /b 1
)

echo Setting up database...
psql -U postgres -f init-db.sql
if errorlevel 1 (
    echo Failed to initialize database!
    pause
    exit /b 1
)

echo Creating client build directory...
if not exist "dist" mkdir dist
if not exist "dist\public" mkdir dist\public

echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo Building client...
call npm run build
if errorlevel 1 (
    echo Failed to build client!
    pause
    exit /b 1
)

echo Pushing database schema...
call npm run db:push
if errorlevel 1 (
    echo Failed to push database schema!
    pause
    exit /b 1
)

echo Starting development server...
echo Server will be available at http://localhost:3000
echo Press Ctrl+C to stop the server

rem Start the server with more verbose output
set DEBUG=express:*,app:*
call npx tsx --inspect --trace-warnings server/index.ts

if errorlevel 1 (
    echo Server failed to start. Check the error messages above.
    pause
    exit /b 1
)

pause 
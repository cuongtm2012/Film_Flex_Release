@echo off
setlocal

echo Checking PostgreSQL status...
net start postgresql-x64-14
if errorlevel 1 (
    echo PostgreSQL service not found or couldn't be started
    echo Please ensure PostgreSQL is installed and the service name is correct
    pause
    exit /b 1
)

rem Set environment variables
set NODE_ENV=development
set DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
set SESSION_SECRET=local_development_secret
set PORT=3000

echo Installing dependencies...
call npm install

echo Setting up database...
call npm run db:push

echo Starting development server...
call npx tsx server/index.ts

pause 
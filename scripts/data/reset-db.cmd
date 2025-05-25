@echo off
setlocal EnableDelayedExpansion

:: FilmFlex Database Reset Script for Windows
:: This script provides a convenient way to run the database reset operation

:: Change to project root directory (2 levels up from scripts/data folder)
cd /d "%~dp0\..\.."

echo ========================================
echo   FilmFlex Database Reset
echo ========================================
echo.

:: Check for database URL
if "%DATABASE_URL%"=="" (
  if exist .env (
    echo Loading DATABASE_URL from .env file...
    for /f "tokens=1,* delims==" %%a in ('findstr /b DATABASE_URL .env') do (
      set DATABASE_URL=%%b
    )
  ) else (
    echo No DATABASE_URL found in environment or .env file.
    echo Using default local database URL:
    set DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
  )
)

echo Using database: %DATABASE_URL%

:: Warning and confirmation prompt
echo.
echo WARNING: This script will completely reset the film database.
echo ALL DATA WILL BE PERMANENTLY DELETED.
echo This includes all movies, users, comments, and other data.
echo.

set /p confirm=Are you sure you want to proceed? (y/N): 
if /i not "%confirm%"=="y" (
  echo.
  echo Database reset cancelled.
  exit /b 0
)

echo.
echo Starting database reset process...

:: Create log directory if needed
if not exist logs mkdir logs

:: First ensure database exists
echo Checking database existence...
node scripts\data\ensure-db.cjs
if %ERRORLEVEL% NEQ 0 (
  echo Failed to ensure database exists. Aborting.
  exit /b 1
)

:: Set up timestamp for log file
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set datetime=%%a
set logfile=logs\db-reset-%datetime:~0,8%-%datetime:~8,6%.log

:: Run the TypeScript reset script with the correct path
echo Running database reset script...
npx tsx scripts\data\reset-film-database.ts > %logfile% 2>&1
type %logfile%

if %ERRORLEVEL% EQU 0 (
  echo.
  echo Database reset completed successfully!
) else (
  echo.
  echo Database reset failed with exit code %ERRORLEVEL%.
  echo Check the log file for more details.
)

echo.
echo Done.
pause 
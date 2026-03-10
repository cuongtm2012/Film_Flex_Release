@echo off
echo Fixing Redis MISCONF error...
echo.

REM Connect to Redis and disable stop-writes-on-bgsave-error
redis-cli -h localhost -p 6379 CONFIG SET stop-writes-on-bgsave-error no

if %ERRORLEVEL% EQU 0 (
    echo ✅ Redis configuration updated successfully!
    echo Redis will now accept writes even if background save fails.
) else (
    echo ❌ Failed to update Redis configuration.
    echo.
    echo Please run this command manually in Redis CLI:
    echo   CONFIG SET stop-writes-on-bgsave-error no
    echo.
    echo Or add this to your redis.conf:
    echo   stop-writes-on-bgsave-error no
)

pause

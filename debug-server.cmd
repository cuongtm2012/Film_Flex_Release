@echo off
setlocal EnableDelayedExpansion

echo Setting environment variables...
set NODE_ENV=development
set DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
set SESSION_SECRET=local_development_secret
set PORT=3000
set DEBUG=*
set NODE_OPTIONS=--trace-warnings --inspect

echo Starting server in debug mode...
echo Server will be available at http://localhost:3000
echo Debug interface will be available at chrome://inspect
echo.
echo Press Ctrl+C to stop the server

call npx tsx server/index.ts 2>&1 | tee server.log

pause 
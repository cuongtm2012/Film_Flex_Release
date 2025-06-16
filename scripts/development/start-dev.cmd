@echo off
setlocal

rem Set environment variables
set NODE_ENV=development
set DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
set SESSION_SECRET=local_development_secret
set PORT=3000

rem Install dependencies if needed
call npm install

rem Start the development server
call npx tsx server/index.ts

pause 
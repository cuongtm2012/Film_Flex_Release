@echo off
SET NODE_ENV=development
SET DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SET SESSION_SECRET=local_development_secret
SET PORT=5000
npm run dev 
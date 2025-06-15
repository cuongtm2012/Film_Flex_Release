root@lightnode:~/Film_Flex_Release/scripts/deployment# ls
README.md  archive  env.example  filmflex-server.cjs  final-deploy.sh  push-to-github.sh
root@lightnode:~/Film_Flex_Release/scripts/deployment# ./final
-bash: ./final: No such file or directory
root@lightnode:~/Film_Flex_Release/scripts/deployment# ./final-deploy.sh 
===== FilmFlex Final Deployment Started at Thu May  8 22:27:22 CST 2025 =====
Source directory: /root/Film_Flex_Release
Deploy directory: /var/www/filmflex
0. Fixing database schema...
Database connection details:
  Host: localhost
  Port: 
5432
  Database: filmflex
  User: filmflex
Executing SQL fixes...
Password for user filmflex: 
psql:/tmp/db-fix.sql:5: NOTICE:  column "movie_id" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:6: NOTICE:  column "name" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:7: NOTICE:  column "title" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:8: NOTICE:  column "origin_name" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:9: NOTICE:  column "description" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:10: NOTICE:  column "thumb_url" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:11: NOTICE:  column "poster_url" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:12: NOTICE:  column "trailer_url" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:13: NOTICE:  column "time" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:14: NOTICE:  column "quality" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:15: NOTICE:  column "lang" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:16: NOTICE:  column "year" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:17: NOTICE:  column "view" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:18: NOTICE:  column "actors" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:19: NOTICE:  column "directors" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:20: NOTICE:  column "categories" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:21: NOTICE:  column "countries" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:22: NOTICE:  column "modified_at" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:23: NOTICE:  column "type" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:24: NOTICE:  column "status" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:25: NOTICE:  column "slug" of relation "movies" already exists, skipping
ALTER TABLE
psql:/tmp/db-fix.sql:55: ERROR:  column reference "column_name" is ambiguous
LINE 5:       AND column_name = column_name
                  ^
DETAIL:  It could refer to either a PL/pgSQL variable or a table column.
QUERY:  NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'movies' 
      AND column_name = column_name
    )
CONTEXT:  PL/pgSQL function inline_code_block line 13 at IF
psql:/tmp/db-fix.sql:91: NOTICE:  episodes table already exists
psql:/tmp/db-fix.sql:91: NOTICE:  movie_slug column already exists in episodes table
DO
DO
Database schema fix completed successfully
1. Stopping any existing FilmFlex processes...
2. Setting up deployment directory...
3. Creating proper package.json without ESM type...
4. Copying CommonJS server file...
5. Creating start script...
6. Installing dependencies...

up to date, audited 99 packages in 1s

16 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
7. Copying scripts directory...
   - Copying import scripts...
8. Setting up environment variables...
9. Starting server with PM2...
   - Checking for processes using port 5000...
[PM2] Starting /var/www/filmflex/filmflex-server.cjs in fork_mode (1 instance)
[PM2] Done.
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ filmflex    │ default     │ 1.0.0   │ fork    │ 175838   │ 0s     │ 0    │ online    │ 0%       │ 27.8mb   │ root     │ disabled │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Saving current process list...
[PM2] Successfully saved in /root/.pm2/dump.pm2
10. Verifying server status...
   ! Server failed to start properly
   - Starting with direct method...
[PM2] Applying action stopProcessId on app [filmflex](ids: [ 0 ])
[PM2] [filmflex](0) ✓
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ filmflex    │ default     │ 1.0.0   │ fork    │ 0        │ 0      │ 0    │ stopped   │ 0%       │ 0b       │ root     │ disabled │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Applying action deleteProcessId on app [filmflex](ids: [ 0 ])
[PM2] [filmflex](0) ✓
┌────┬───────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name      │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
└────┴───────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Starting /var/www/filmflex/start.sh in fork_mode (1 instance)
[PM2] Done.
┌────┬─────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name        │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼─────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ filmflex    │ default     │ 1.0.0   │ fork    │ 175893   │ 0s     │ 0    │ online    │ 0%       │ 3.3mb    │ root     │ disabled │
└────┴─────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Saving current process list...
[PM2] Successfully saved in /root/.pm2/dump.pm2
   ! All automatic methods failed
   - Please try manually running: node /var/www/filmflex/filmflex-server.cjs
11. Checking API response...
   ✓ API is responding correctly: {"status":"ok","message":"FilmFlex API is running in production mode","time":"2025-05-08T14:27:43.437Z","node_version":"v20.19.1"}
12. Reloading Nginx configuration...
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
===== FilmFlex Final Deployment Completed at Thu May  8 22:27:43 CST 2025 =====

To check the status, use these commands:
  - Server status: pm2 status filmflex
  - Server logs: pm2 logs filmflex
  - API check: curl http://localhost:5000/api/health
  - Web check: Visit https://phimgg.com

Movie import commands:
  - Daily import: cd /var/www/filmflex/scripts/data && ./import-movies.sh
  - Full import (resumable): cd /var/www/filmflex/scripts/data && ./import-all-movies-resumable.sh
  - Set up cron jobs: cd /var/www/filmflex/scripts/data && sudo ./setup-cron.sh

Need help or encountered issues?
  The comprehensive database fix is now built directly into this script.
  This script can be run again at any time to fix both deployment and database issues.
  Manual server start: node /var/www/filmflex/filmflex-server.cjs
root@lightnode:~/Film_Flex_Release/scripts/deployment# 
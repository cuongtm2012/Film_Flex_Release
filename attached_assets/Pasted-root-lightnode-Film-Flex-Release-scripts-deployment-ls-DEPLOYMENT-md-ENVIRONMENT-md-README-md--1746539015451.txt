root@lightnode:~/Film_Flex_Release/scripts/deployment# ls
DEPLOYMENT.md  ENVIRONMENT.md  README.md  deploy-filmflex.sh  env.example
root@lightnode:~/Film_Flex_Release/scripts/deployment# ./deploy-filmflex.sh --status
2025-05-06 21:39:31 - ===== SYSTEM STATUS =====
System Uptime:
 21:39:31 up 1 day,  3:27,  2 users,  load average: 0.00, 0.01, 0.00

Memory Usage:
               total        used        free      shared  buff/cache   available
Mem:           3.8Gi       579Mi       564Mi        17Mi       2.7Gi       3.0Gi
Swap:             0B          0B          0B

Disk Usage:
/dev/vda2        50G  7.8G   43G  16% /
tmpfs           2.0G   28K  2.0G   1% /dev/shm

Application Status:
× filmflex.service - FilmFlex Application
     Loaded: loaded (/etc/systemd/system/filmflex.service; enabled; vendor preset: enabled)
     Active: failed (Result: protocol) since Tue 2025-05-06 10:51:05 CST; 10h ago
    Process: 40631 ExecStart=/usr/bin/pm2 start ecosystem.config.cjs (code=exited, status=0/SUCCESS)
        CPU: 344ms

May 06 10:51:05 lightnode systemd[1]: Failed to start FilmFlex Application.
May 06 10:51:05 lightnode systemd[1]: filmflex.service: Scheduled restart job, restart counter is at 6.
May 06 10:51:05 lightnode systemd[1]: Stopped FilmFlex Application.
May 06 10:51:05 lightnode systemd[1]: filmflex.service: Start request repeated too quickly.
May 06 10:51:05 lightnode systemd[1]: filmflex.service: Failed with result 'protocol'.
May 06 10:51:05 lightnode systemd[1]: Failed to start FilmFlex Application.
Service not found

PM2 Process Status:
┌────┬────────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name               │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ filmflex           │ cluster  │ 0    │ online    │ 0%       │ 84.7mb   │
│ 1  │ filmflex           │ cluster  │ 0    │ online    │ 0%       │ 86.8mb   │
└────┴────────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘

Nginx Status:
● nginx.service - A high performance web server and a reverse proxy server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2025-05-05 18:33:22 CST; 1 day 3h ago
       Docs: man:nginx(8)
   Main PID: 9765 (nginx)

Recent Application Logs:

Recent Error Logs:
You have triggered an unhandledRejection, you may have forgotten to catch a Promise rejection:
Error: DATABASE_URL must be set. Did you forget to provision a database?
    at file:///var/www/filmflex/dist/index.js:428:9
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)
You have triggered an unhandledRejection, you may have forgotten to catch a Promise rejection:
Error: DATABASE_URL must be set. Did you forget to provision a database?
    at file:///var/www/filmflex/dist/index.js:428:9
    at ModuleJob.run (node:internal/modules/esm/module_job:263:25)
    at async ModuleLoader.import (node:internal/modules/esm/loader:540:24)

Database Status:
● postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (/lib/systemd/system/postgresql.service; enabled; vendor preset: enabled)
     Active: active (exited) since Tue 2025-05-06 11:41:03 CST; 9h ago
    Process: 59327 ExecStart=/bin/true (code=exited, status=0/SUCCESS)
   Main PID: 59327 (code=exited, status=0/SUCCESS)

Database Size:
Password for user postgres: 
Database not found

Recent Backups:
total 4.0K
-rw------- 1 root root 20 May  5 18:19 filmflex_20250505-181906.sql.gz

Database Tables:
                List of relations
 Schema |        Name         | Type  |  Owner   
--------+---------------------+-------+----------
 public | analytics_events    | table | filmflex
 public | api_keys            | table | filmflex
 public | api_requests        | table | filmflex
 public | audit_logs          | table | filmflex
 public | comments            | table | filmflex
 public | content_approvals   | table | filmflex
 public | content_performance | table | filmflex
 public | episodes            | table | filmflex
 public | movies              | table | filmflex
 public | permissions         | table | filmflex
 public | role_permissions    | table | filmflex
 public | roles               | table | filmflex
 public | users               | table | filmflex
 public | view_history        | table | filmflex
 public | watchlist           | table | filmflex
(15 rows)


Application Health Check:
Application not responding to health check
2025-05-06 21:41:06 - Deployment script completed successfully!
For more information on managing your FilmFlex deployment, see DEPLOYMENT.md
root@lightnode:~/Film_Flex_Release/scripts/deployment# ^C
root@lightnode:~/Film_Flex_Release/scripts/deployment# 
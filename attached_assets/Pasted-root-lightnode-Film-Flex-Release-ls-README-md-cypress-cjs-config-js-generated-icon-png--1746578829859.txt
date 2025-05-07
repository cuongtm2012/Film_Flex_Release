root@lightnode:~/Film_Flex_Release# ls
README.md          cypress.cjs.config.js  generated-icon.png  package.json       server              vite.config.ts
attached_assets    cypress.config.js      jest.config.js      postcss.config.js  shared
browserstack.json  dist                   log                 replit_agent       tailwind.config.ts
client             drizzle.config.ts      nginx               reports            test.html
components.json    ecosystem.config.cjs   node_modules        results            tests
cypress            ecosystem.config.js    package-lock.json   scripts            tsconfig.json
root@lightnode:~/Film_Flex_Release# cd scripts/
root@lightnode:~/Film_Flex_Release/scripts# cd data
root@lightnode:~/Film_Flex_Release/scripts/data# ls
IMPORT_PLAN.md   batch_progress.json            full-import.sh             import-movies-sql.cjs  setup-cron.sh
README.md        complete_import_progress.json  full_import_progress.json  import-movies.sh       test-import.js
batch-import.sh  force-deep-scan.sh             import-all-movies.sh       import_progress.json
root@lightnode:~/Film_Flex_Release/scripts/data# ./full-import.sh 

==============================================
    FilmFlex Full Database Import Script
==============================================

Starting full database import of 2256 pages (approx. 22560 movies)
Will process 23 batches of 100 pages each
Taking a 60-minute break between batches

WARNING: This will attempt to import ALL 2256 pages (22,557+ movies).
The process will take multiple days to complete and use significant resources.
Are you absolutely sure you want to continue? (yes/no) yes

Start from batch number (1-23, default: 1): 2
Starting from batch 2
[2025-05-07 08:46:37] BATCH 2/23: Importing pages 101 to 200

==============================================
    FilmFlex Batch Movie Import Script
==============================================

Starting batch import of movies from pages 101 to 200
Total pages to import: 100
Page size: 10 items
Delay between pages: 3 seconds

Processing page 101 of 200...
Loaded environment variables from .env file
[2025-05-07T00:46:37.773Z] [DATA-IMPORT] Running in SINGLE PAGE MODE - Only importing page 101 with size 10
[2025-05-07T00:46:37.773Z] [DATA-IMPORT] Starting movie data import...
[2025-05-07T00:46:37.773Z] [DATA-IMPORT] ERROR: DATABASE_URL environment variable is not set
[2025-05-07 08:46:37] Successfully imported page 101 (Page 101, Progress: 1%)
Waiting 3 seconds before next page...
Processing page 102 of 200...
Loaded environment variables from .env file
[2025-05-07T00:46:41.062Z] [DATA-IMPORT] Running in SINGLE PAGE MODE - Only importing page 102 with size 10
[2025-05-07T00:46:41.062Z] [DATA-IMPORT] Starting movie data import...
[2025-05-07T00:46:41.062Z] [DATA-IMPORT] ERROR: DATABASE_URL environment variable is not set
[2025-05-07 08:46:37] Successfully imported page 102 (Page 102, Progress: 2%)
Waiting 3 seconds before next page...
Processing page 103 of 200...
Loaded environment variables from .env file
[2025-05-07T00:46:44.356Z] [DATA-IMPORT] Running in SINGLE PAGE MODE - Only importing page 103 with size 10
[2025-05-07T00:46:44.356Z] [DATA-IMPORT] Starting movie data import...
[2025-05-07T00:46:44.356Z] [DATA-IMPORT] ERROR: DATABASE_URL environment variable is not set
[2025-05-07 08:46:37] Successfully imported page 103 (Page 103, Progress: 3%)
Waiting 3 seconds before next page...
Processing page 104 of 200...
Loaded environment variables from .env file
[2025-05-07T00:46:47.639Z] [DATA-IMPORT] Running in SINGLE PAGE MODE - Only importing page 104 with size 10
[2025-05-07T00:46:47.639Z] [DATA-IMPORT] Starting movie data import...
[2025-05-07T00:46:47.639Z] [DATA-IMPORT] ERROR: DATABASE_URL environment variable is not set
[2025-05-07 08:46:37] Successfully imported page 104 (Page 104, Progress: 4%)
Waiting 3 seconds before next page...
Processing page 105 of 200...
Loaded environment variables from .env file
[2025-05-07T00:46:50.930Z] [DATA-IMPORT] Running in SINGLE PAGE MODE - Only importing page 105 with size 10
[2025-05-07T00:46:50.930Z] [DATA-IMPORT] Starting movie data import...
[2025-05-07T00:46:50.930Z] [DATA-IMPORT] ERROR: DATABASE_URL environment variable is not set
[2025-05-07 08:46:37] Successfully imported page 105 (Page 105, Progress: 5%)
Waiting 3 seconds before next page...
^C
root@lightnode:~/Film_Flex_Release/scripts/data# ^C
root@lightnode:~/Film_Flex_Release/scripts/data# 
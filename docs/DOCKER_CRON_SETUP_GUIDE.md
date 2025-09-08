# FilmFlex Cron Setup Comparison Guide

## 🚨 **PROBLEM: Current Setup (Wrong)**

Your current cron jobs are trying to import data into the **HOST system database**, but your FilmFlex app runs in **Docker containers** with an isolated database.

```bash
# Current cron jobs (WRONG - imports to host database)
node scripts/data/import-movies.cjs --max-pages=3

# This connects to: localhost:5432 (host database)
# But your app uses: postgres:5432 (Docker container database)
```

## ✅ **SOLUTION: Docker Setup (Correct)**

Use the Docker-specific import scripts that run **INSIDE** your Docker containers:

```bash
# Correct Docker cron jobs (imports to Docker database)
docker compose -f docker-compose.server.yml exec -T app node scripts/data/import-movies-docker.cjs --max-pages=3

# This connects to the Docker PostgreSQL container
```

## 🔄 **Migration Steps**

### Step 1: Remove Old Cron Jobs
```bash
# Remove the incorrect cron file
sudo rm -f /etc/cron.d/filmflex-import

# Check for any remaining filmflex cron jobs
sudo crontab -l | grep filmflex
```

### Step 2: Install Docker Cron Jobs
```bash
# Upload the new Docker setup script to your server
scp scripts/data/setup-docker-cron.sh root@your-server:/root/Film_Flex_Release/scripts/data/

# Run it on your server
sudo bash ~/Film_Flex_Release/scripts/data/setup-docker-cron.sh
```

### Step 3: Verify Docker Setup
```bash
# Check if your containers are running
docker ps | grep filmflex

# Test Docker database connection
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"

# Test Docker import manually
bash ~/Film_Flex_Release/scripts/data/test-docker-cron.sh
```

## 🎯 **Key Differences**

| Aspect | Current (Wrong) | Docker (Correct) |
|--------|----------------|------------------|
| **Script** | `import-movies.cjs` | `import-movies-docker.cjs` |
| **Database** | `localhost:5432` (host) | `postgres:5432` (container) |
| **Execution** | Directly on host | Inside Docker container |
| **Environment** | Host environment | Docker app environment |
| **Dependencies** | Host Node.js required | Uses container Node.js |

## 📋 **New Schedule (Docker)**

- **Daily Import**: 6 AM & 6 PM (Mon-Fri) - 3 pages (~60 movies)
- **Weekly Deep Scan**: Saturday 6 AM - 10 pages (~200 movies) 
- **Monthly Full Import**: First Sunday 1 AM - Complete refresh

## 🔍 **Verification Commands**

```bash
# Check Docker cron status
sudo bash ~/Film_Flex_Release/scripts/data/setup-docker-cron.sh status

# Check Docker containers
docker ps

# View recent import logs
tail -f /var/log/filmflex/docker-import-*.log

# Check movie count in Docker database
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) FROM movies;"
```

## 🚀 **Benefits of Docker Setup**

1. **Isolated Environment**: Imports run in the same environment as your app
2. **No Host Dependencies**: No need to install Node.js on host system
3. **Consistent Configuration**: Uses same database connection as your app
4. **Auto-Recovery**: Automatically starts containers if they're down
5. **Better Logging**: Separate logs for Docker operations

This fixes the fundamental issue where your cron jobs were trying to import into a database that your app isn't using!
# 🗄️ Docker PostgreSQL Data Import Guide

**Date**: September 8, 2025  
**Status**: Production Ready  
**Server**: 38.54.14.154 (lightnode)

## 📋 **Overview**

This guide covers multiple methods to import movie data into your Docker PostgreSQL database, from basic imports to comprehensive database population.

## 🎯 **Available Import Methods**

### Method 1: API-Based Movie Import (Recommended)
Import fresh movie data directly from the API into your Docker PostgreSQL container.

### Method 2: Local Database Migration  
Transfer existing data from your local PostgreSQL to Docker container.

### Method 3: SQL Backup Restoration
Import from existing SQL backup files.

---

## 🚀 **Method 1: API-Based Movie Import**

### **Quick Import (Latest Movies)**
```bash
# SSH to your server
ssh root@38.54.14.154

# Navigate to FilmFlex directory
cd ~/Film_Flex_Release

# Import latest 20 movies
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --single-page --page-num=1 --page-size=20

# Import from multiple pages (100 movies)
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --max-pages=5
```

### **Deep Scan Import (Weekend/Comprehensive)**
```bash
# Deep scan (10 pages, ~500 movies)
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --deep-scan --max-pages=10

# Force reimport existing movies
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --force-import --max-pages=5
```

### **Comprehensive Import (All Available Movies)**
```bash
# Start comprehensive import (thousands of movies)
docker compose -f docker-compose.server.yml exec app bash scripts/data/import-all-movies-resumable.sh

# This script:
# ✅ Can be paused and resumed
# ✅ Handles network interruptions
# ✅ Tracks progress automatically  
# ✅ Estimates completion time
```

### **Import Specific Movie**
```bash
# Import by movie slug
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --movie-slug="avatar-the-way-of-water"
```

### **Test Mode (No Database Changes)**
```bash
# Test API connectivity and data parsing
docker compose -f docker-compose.server.yml exec app node scripts/data/import-movies-sql.cjs --test-mode --single-page --page-size=5
```

---

## 🗄️ **Method 2: Local Database Migration**

### **Step 1: Export from Local Database**
```bash
# On your local machine
cd /Users/jack/Desktop/1.PROJECT/Film_Flex_Release

# Create database export
./export-local-database.sh

# This creates:
# ✅ filmflex_schema.sql - Database structure
# ✅ filmflex_data_clean_[timestamp].sql - Clean data
# ✅ import_to_docker_[timestamp].sh - Import script
```

### **Step 2: Transfer to Server**  
```bash
# Upload export files to server
scp -r shared/ root@38.54.14.154:~/Film_Flex_Release/

# Or use the transfer script
./transfer-data.sh
```

### **Step 3: Import on Server**
```bash
# SSH to server
ssh root@38.54.14.154
cd ~/Film_Flex_Release/shared

# Run the generated import script
./import_to_docker_[timestamp].sh

# Verify import
./verify_database_[timestamp].sh
```

---

## 📥 **Method 3: Direct SQL Import**

### **Import Schema First**
```bash
# Copy schema to container
docker cp filmflex_schema.sql filmflex-postgres:/tmp/

# Import schema
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -f /tmp/filmflex_schema.sql
```

### **Import Data**
```bash
# Copy data file to container  
docker cp filmflex_data_clean.sql filmflex-postgres:/tmp/

# Import data
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -f /tmp/filmflex_data_clean.sql
```

### **Import Individual Tables**
```bash
# Import specific tables
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "
COPY movies FROM '/tmp/movies.csv' WITH CSV HEADER;
COPY episodes FROM '/tmp/episodes.csv' WITH CSV HEADER;
COPY users FROM '/tmp/users.csv' WITH CSV HEADER;
"
```

---

## 🔍 **Database Verification Commands**

### **Check Movie Count**
```bash
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT COUNT(*) as total_movies FROM movies;"
```

### **Check All Tables**
```bash
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "
SELECT 
    'movies' as table_name, COUNT(*) as row_count FROM movies
UNION ALL
SELECT 'episodes', COUNT(*) FROM episodes  
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
ORDER BY table_name;
"
```

### **Check Recent Imports**
```bash
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "
SELECT name, year, modified_at 
FROM movies 
ORDER BY modified_at DESC 
LIMIT 10;
"
```

### **Database Size Information**
```bash
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "
SELECT 
    pg_size_pretty(pg_database_size('filmflex')) as database_size,
    pg_size_pretty(pg_total_relation_size('movies')) as movies_table_size,
    pg_size_pretty(pg_total_relation_size('episodes')) as episodes_table_size;
"
```

---

## 📊 **Import Script Parameters**

### **Available Parameters**
```bash
# Page control
--single-page              # Import one page only
--page-num=1               # Specify page number  
--page-size=20             # Movies per page
--max-pages=10             # Maximum pages to import

# Import modes
--deep-scan                # Import more pages (weekend mode)
--force-import            # Reimport existing movies
--test-mode               # Test without database changes
--comprehensive           # Import all available movies

# Specific targeting
--movie-slug="movie-name" # Import specific movie by slug
```

### **Environment Variables**
```bash
# Database connection (already set in Docker)
DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex

# API configuration
API_BASE_URL=https://phimapi.com
MOVIE_LIST_ENDPOINT=/danh-sach/phim-moi-cap-nhat
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**1. Container Not Running**
```bash
# Check container status
docker compose -f docker-compose.server.yml ps

# Start if needed
docker compose -f docker-compose.server.yml up -d postgres
```

**2. Permission Denied**
```bash
# Fix file permissions
chmod +x scripts/data/*.sh
chmod +x shared/*.sh
```

**3. Database Connection Error**
```bash
# Test connection
docker compose -f docker-compose.server.yml exec postgres psql -U filmflex -d filmflex -c "SELECT 1;"
```

**4. Import Script Fails**
```bash
# Check logs
docker compose -f docker-compose.server.yml logs app

# Install dependencies
docker compose -f docker-compose.server.yml exec app npm install axios pg dotenv
```

**5. Out of Space**
```bash
# Check disk usage
df -h

# Clean Docker images
docker system prune -f
```

### **Log Locations**
```bash
# Application logs
docker compose -f docker-compose.server.yml logs -f app

# PostgreSQL logs  
docker compose -f docker-compose.server.yml logs -f postgres

# Import logs (if using resumable script)
tail -f ~/Film_Flex_Release/log/complete-node-import.log
```

---

## 📈 **Performance Optimization**

### **For Large Imports**
```bash
# Increase connection pool
export DATABASE_MAX_CONNECTIONS=50

# Use batch processing
--max-pages=5  # Process in smaller batches

# Monitor system resources
docker stats
```

### **Resume Interrupted Imports**
```bash
# The resumable script automatically saves progress
bash scripts/data/import-all-movies-resumable.sh

# Select "resume" when prompted
# Script will continue from last successful page
```

---

## ✅ **Success Indicators**

After a successful import, you should see:

1. **Movies in Database**: `SELECT COUNT(*) FROM movies;` shows increased count
2. **Recent Modified Dates**: New movies have recent `modified_at` timestamps  
3. **Episodes**: `SELECT COUNT(*) FROM episodes;` shows episode data
4. **No Errors**: Import logs show successful completion
5. **Application Works**: http://38.54.14.154:5000 shows new content

---

## 🎯 **Recommended Import Strategy**

### **Daily Updates** (Automated via cron)
```bash
# Import latest movies (3 pages = ~150 movies)
node scripts/data/import-movies-sql.cjs --max-pages=3
```

### **Weekly Deep Scan** (Saturdays)
```bash  
# Deep scan for missed movies (10 pages = ~500 movies)
node scripts/data/import-movies-sql.cjs --deep-scan --max-pages=10
```

### **Monthly Comprehensive** (First Sunday)
```bash
# Comprehensive update and cleanup
bash scripts/data/import-all-movies-resumable.sh
```

This import system provides flexibility for different needs, from quick updates to comprehensive database population, with robust error handling and resumption capabilities.
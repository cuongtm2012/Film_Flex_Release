# PostgreSQL Authentication Fix Guide
## Problem: "Peer authentication failed" error

This guide provides multiple solutions to fix PostgreSQL authentication issues on phimgg.com production server.

## Quick Solution (Recommended)

Run the automated fix script:
```bash
ssh root@154.205.142.255
cd /var/www/filmflex
chmod +x scripts/db/fix-postgres-auth.sh
./scripts/db/fix-postgres-auth.sh
```

## Manual Solution

### Step 1: Check Current Configuration
```bash
ssh root@154.205.142.255
sudo -u postgres psql -c '\du'
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -E '^(local|host)'
```

### Step 2: Backup Configuration
```bash
sudo cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup
```

### Step 3: Update Authentication Method
Edit the pg_hba.conf file:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Change these lines:
```
# FROM:
local   all             all                                     peer
host    all             all             127.0.0.1/32            ident
host    all             all             ::1/128                 ident

# TO:
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### Step 4: Create Application User
```bash
sudo -u postgres psql
```

In PostgreSQL console:
```sql
CREATE USER filmflex WITH PASSWORD 'filmflex2024!';
GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
ALTER USER filmflex CREATEDB;
\q
```

### Step 5: Restart PostgreSQL
```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### Step 6: Test Connection
```bash
PGPASSWORD='filmflex2024!' psql -h localhost -U filmflex -d filmflex -c '\dt'
```

### Step 7: Update Environment Variables
Update your .env file:
```env
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
```

## Alternative Solutions

### Solution A: Use postgres superuser
```bash
sudo -u postgres psql -d filmflex
```

### Solution B: Trust authentication (less secure)
Edit pg_hba.conf and change authentication method to `trust` temporarily:
```
local   all             all                                     trust
```

### Solution C: Socket connection
Use Unix socket connection:
```bash
sudo -u postgres psql -h /var/run/postgresql -d filmflex
```

## After Authentication Fix

Once authentication is working, run the database schema fix:

```bash
cd /var/www/filmflex
node scripts/data/fix-array-columns.cjs
```

Then test movie import:
```bash
node scripts/data/import-movies-sql.cjs
```

## Troubleshooting

### If PostgreSQL won't start:
```bash
sudo systemctl status postgresql
sudo journalctl -u postgresql -n 20
```

### If connection still fails:
```bash
sudo netstat -tlnp | grep 5432
sudo ufw status
```

### Check PostgreSQL logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

## Security Notes

- The password 'filmflex2024!' is for production use
- Consider using environment variables for sensitive data
- Regularly update PostgreSQL and monitor access logs
- Use SSL connections in production when possible

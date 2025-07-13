# Quick PostgreSQL Password Change Commands
# Production Server: phimgg.com (154.205.142.255)

## 🚀 One-Liner Commands (Choose One)

### Method 1: Direct SQL Command
```bash
sudo -u postgres psql -c "ALTER USER filmflex PASSWORD 'filmflex2024';"
```

### Method 2: Complete User Setup
```bash
sudo -u postgres psql -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'filmflex') THEN
        CREATE USER filmflex WITH PASSWORD 'filmflex2024';
        GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
        GRANT ALL ON SCHEMA public TO filmflex;
        ALTER USER filmflex CREATEDB;
        RAISE NOTICE 'Created filmflex user';
    ELSE
        ALTER USER filmflex PASSWORD 'filmflex2024';
        GRANT ALL PRIVILEGES ON DATABASE filmflex TO filmflex;
        GRANT ALL ON SCHEMA public TO filmflex;
        RAISE NOTICE 'Updated filmflex password';
    END IF;
END\$\$;"
```

### Method 3: Test Connection
```bash
PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT version();"
```

## 📝 Manual Steps

1. **SSH to production server:**
   ```bash
   ssh root@154.205.142.255
   ```

2. **Change password:**
   ```bash
   sudo -u postgres psql
   ```
   ```sql
   ALTER USER filmflex PASSWORD 'filmflex2024';
   \q
   ```

3. **Test connection:**
   ```bash
   PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT 1;"
   ```

4. **Update environment:**
   ```bash
   echo "DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable" > ~/.env
   ```

## 🔧 Automated Scripts

Run any of these scripts on the production server:

### Bash Script:
```bash
bash scripts/db/fix-filmflex-password.sh
```

### PowerShell Script (if available):
```powershell
./scripts/db/fix-filmflex-password.ps1
```

## ✅ Verification Commands

```bash
# Check user exists
sudo -u postgres psql -c "\du filmflex"

# Test password
PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT current_user;"

# Check permissions
PGPASSWORD='filmflex2024' psql -h localhost -U filmflex -d filmflex -c "SELECT current_database();"
```

## 🔄 Update Application Config

After changing the password, update:

1. **Environment variables:**
   ```bash
   export DATABASE_URL="postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable"
   ```

2. **PM2 configurations:**
   ```bash
   pm2 stop all
   # Edit ecosystem.config.cjs with new password
   pm2 start ecosystem.config.cjs
   ```

3. **Application restart:**
   ```bash
   pm2 restart all
   ```

## 🆘 Troubleshooting

If connection fails:

1. **Check PostgreSQL status:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Check authentication method:**
   ```bash
   sudo cat /etc/postgresql/*/main/pg_hba.conf | grep filmflex
   ```

3. **Restart PostgreSQL:**
   ```bash
   sudo systemctl restart postgresql
   ```

## 📋 Final Connection String

After successful password change:
```
postgresql://filmflex:filmflex2024@localhost:5432/filmflex?sslmode=disable
```

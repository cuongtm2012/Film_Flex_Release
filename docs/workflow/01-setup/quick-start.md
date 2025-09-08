# 🚀 FilmFlex Quick Start Guide

**Status**: Production Ready | **Server**: 38.54.14.154 | **Domain**: phimgg.com

## 🎯 **What You Need**

- Linux server (Ubuntu 20.04+)
- Node.js 18+
- PostgreSQL database
- Domain name (optional)

## ⚡ **5-Minute Setup**

### **1. Get the Code**
```bash
# Clone repository
git clone https://github.com/your-username/Film_Flex_Release.git
cd Film_Flex_Release

# Or upload your code
scp -r Film_Flex_Release/ user@your-server:/root/
```

### **2. Run Automated Setup**
```bash
# Make setup executable
chmod +x setup-server-automation.sh

# Run complete setup (creates everything)
./setup-server-automation.sh
```

**This single script does everything:**
- ✅ Installs dependencies
- ✅ Sets up database 
- ✅ Configures environment
- ✅ Deploys application
- ✅ Sets up automation (daily imports, backups, monitoring)
- ✅ Configures health checks

### **3. Verify Setup**
```bash
# Check application
curl http://localhost:5000

# Check containers (if using Docker)
docker compose -f docker-compose.server.yml ps

# Check automation
crontab -l
```

## 🌐 **Access Your Application**

- **Local**: http://localhost:5000
- **Production IP**: http://38.54.14.154:5000  
- **Domain**: http://phimgg.com (when DNS configured)

## 🔧 **Manual Setup (Alternative)**

If you prefer step-by-step control:

### **Environment Setup**
```bash
# Install Node.js & PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### **Application Setup**
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.cjs
```

## 📊 **What Gets Automated**

Your FilmFlex setup includes:

- **Daily Movie Import** (2:00 AM): ~150 latest movies
- **Weekly Deep Scan** (Saturday 3:00 AM): ~500 movies  
- **Database Backups** (1:00 AM daily): Compressed SQL exports
- **Health Monitoring** (Every 30 min): Auto-restart if needed
- **Log Cleanup**: Automatic old file removal

## 🎬 **Success!**

After setup, your FilmFlex application will:
- ✅ Automatically import new movies daily
- ✅ Monitor itself and restart if needed
- ✅ Backup database regularly
- ✅ Serve thousands of movies to users
- ✅ Handle high traffic with PM2 clustering

**Next Steps**: [Development Guide](02-development/development-workflow.md) | [Deployment Details](03-deployment/production-deployment.md)
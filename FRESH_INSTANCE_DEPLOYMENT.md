# 🚀 FilmFlex Fresh Instance Deployment Guide

## 📋 **New VPS Instance Details**
- **IP**: 154.205.142.255
- **OS**: Ubuntu 22.04 LTS
- **Location**: Ho Chi Minh, Vietnam
- **Specs**: 2 vCPU, 4GB RAM, 50GB SSD

## 🎯 **Quick Start Deployment**

### **Step 1: Upload Files to New Server**

From your Windows machine (PowerShell/Git Bash):

```powershell
# Upload the fresh deployment script
scp filmflex-fresh-deploy.sh root@154.205.142.255:/root/

# Upload the entire project
scp -r . root@154.205.142.255:/root/Film_Flex_Release/
```

### **Step 2: Setup Fresh Server**

SSH to the new server and run initial setup:

```bash
# SSH to the new server
ssh root@154.205.142.255

# Make the script executable
chmod +x /root/filmflex-fresh-deploy.sh

# Run initial server setup (installs Node.js, PM2, PostgreSQL, Nginx)
/root/filmflex-fresh-deploy.sh setup
```

### **Step 3: Deploy FilmFlex Application**

```bash
# Navigate to project directory
cd /root/Film_Flex_Release

# Make sure the fresh deploy script is executable
chmod +x filmflex-fresh-deploy.sh

# Deploy the application
./filmflex-fresh-deploy.sh deploy full
```

### **Step 4: Verify Deployment**

```bash
# Check application status
./filmflex-fresh-deploy.sh status

# View logs if needed
./filmflex-fresh-deploy.sh logs 20

# Test the application
curl http://154.205.142.255:5000
curl http://154.205.142.255/api/health
```

## 🔧 **Alternative Upload Method**

If you prefer using the existing upload script:

```powershell
# From your Windows machine
./upload.sh
```

This will upload all files to the new server automatically.

## 🎉 **Expected Results**

After successful deployment, you should see:

- ✅ **PM2 Status**: ONLINE
- ✅ **Port 5000**: LISTENING  
- ✅ **HTTP Status**: RESPONDING
- ✅ **Nginx**: Running and proxying requests
- ✅ **PostgreSQL**: Database configured
- ✅ **URL**: http://154.205.142.255 (accessible from browser)

## 🚨 **If Issues Occur**

### **Problem: npm not found**
```bash
# Re-run server setup
./filmflex-fresh-deploy.sh setup
```

### **Problem: Application not starting**
```bash
# Check logs and fix issues
./filmflex-fresh-deploy.sh logs 50
./filmflex-fresh-deploy.sh fix all
```

### **Problem: Port not listening**
```bash
# Restart the application
./filmflex-fresh-deploy.sh restart
```

## 📊 **Available Commands**

| Command | Description |
|---------|-------------|
| `./filmflex-fresh-deploy.sh setup` | Initial server setup |
| `./filmflex-fresh-deploy.sh deploy full` | Full deployment |
| `./filmflex-fresh-deploy.sh deploy quick` | Quick redeploy |
| `./filmflex-fresh-deploy.sh status` | Check status |
| `./filmflex-fresh-deploy.sh restart` | Restart app |
| `./filmflex-fresh-deploy.sh logs 50` | View 50 log lines |
| `./filmflex-fresh-deploy.sh fix all` | Fix common issues |

## 🌐 **URLs After Deployment**

- **Main Application**: http://154.205.142.255
- **Health Check**: http://154.205.142.255/api/health  
- **Direct Node.js**: http://154.205.142.255:5000

---

**Created**: July 5, 2025  
**Server**: 154.205.142.255 (Fresh Ubuntu 22.04)  
**Status**: Ready for deployment

# Ubuntu 22.04 VPS Deployment Guide

## 🚀 Quick Start (Recommended)

Your Docker image is ready: `cuongtm2012/filmflex:ubuntu-22.04`

### Option 1: One-Command Deployment
```bash
# Run this single command on your Ubuntu 22.04 VPS:
curl -fsSL https://raw.githubusercontent.com/your-repo/Film_Flex_Release/main/quick-deploy.sh | bash
```

### Option 2: Manual Step-by-Step

#### Step 1: Transfer Files to VPS
```bash
# Upload these files to your VPS:
scp vps-deployment-commands.sh root@your-vps-ip:~/
scp docker-compose.prod.yml root@your-vps-ip:~/
scp -r nginx root@your-vps-ip:~/
```

#### Step 2: SSH into VPS and Run Setup
```bash
ssh root@your-vps-ip
chmod +x vps-deployment-commands.sh
./vps-deployment-commands.sh
```

#### Step 3: Start Application
```bash
cd ~/filmflex-deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Monitoring & Management

### Check Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Update Application
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Stop Application
```bash
docker-compose -f docker-compose.prod.yml down
```

## 🔧 Troubleshooting

### If port 5000 is blocked:
```bash
sudo ufw allow 5000
```

### If Docker isn't starting:
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Reset deployment:
```bash
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a
./vps-deployment-commands.sh
```

## 🌐 Access Your Application

Once deployed, access Film Flex at:
- **Local VPS**: `http://localhost:5000`
- **External**: `http://YOUR_VPS_IP:5000`

## ✅ What's Included

- ✅ Docker image optimized for Ubuntu 22.04
- ✅ Production-ready configuration
- ✅ Nginx reverse proxy setup
- ✅ SSL/TLS ready configuration
- ✅ Automatic container restart
- ✅ Volume persistence for data
- ✅ Health checks and monitoring

## 🚀 Next Steps

1. **Domain Setup**: Point your domain to the VPS IP
2. **SSL Certificate**: Use Let's Encrypt for HTTPS
3. **Monitoring**: Set up log monitoring and alerts
4. **Backup**: Configure database backups
5. **CDN**: Consider using a CDN for static assets

---

**Your Film Flex application is now ready for production deployment on Ubuntu 22.04!**
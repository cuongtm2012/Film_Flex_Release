# PhimGG Domain Management

This directory contains the unified domain management solution for PhimGG.

## 🚀 **Unified Script: domain-manager.sh**

All domain-related functionality has been consolidated into a single, comprehensive script that handles:

- **DNS diagnostics and troubleshooting**
- **Complete domain setup with SSL**
- **Nginx configuration**
- **Automated SSL certificate installation**
- **Remote deployment**
- **Monitoring and status checks**

## 📋 **Usage**

### **1. Run DNS Diagnostics**
```bash
sudo bash domain-manager.sh diagnose [domain]
```
Example:
```bash
sudo bash domain-manager.sh diagnose phimgg.com
```

### **2. Complete Domain Setup**
```bash
sudo bash domain-manager.sh setup [domain] [server-ip] [email]
```
Example:
```bash
sudo bash domain-manager.sh setup phimgg.com 38.54.14.154 admin@phimgg.com
```

### **3. Install SSL Certificate Only**
```bash
sudo bash domain-manager.sh ssl [domain]
```
Example:
```bash
sudo bash domain-manager.sh ssl phimgg.com
```

### **4. Fix Nginx Configuration Errors**
```bash
sudo bash domain-manager.sh fix [domain]
```
Example:
```bash
sudo bash domain-manager.sh fix phimgg.com
```

### **5. Deploy to Remote Server**
```bash
bash domain-manager.sh deploy [user@server]
```
Example:
```bash
bash domain-manager.sh deploy root@38.54.14.154
```

### **6. Monitor Domain Status**
```bash
bash domain-manager.sh monitor [domain]
```
Example:
```bash
bash domain-manager.sh monitor phimgg.com
```

## 🔧 **What It Does**

### **DNS Diagnostics Mode**
- Checks A records for domain and www subdomain
- Tests DNS propagation across multiple DNS servers
- Verifies server connectivity and port accessibility
- Tests HTTP response from both IP and domain
- Provides specific recommendations for fixing issues

### **Setup Mode**
- Installs all prerequisites (nginx, certbot, DNS tools)
- Creates optimized nginx configuration with security headers
- Sets up SSL certificate (if DNS is ready) or automated SSL installation
- Updates application configuration
- Configures firewall rules

### **SSL Mode**
- Verifies DNS configuration
- Installs Let's Encrypt SSL certificate
- Updates nginx configuration automatically

### **Deploy Mode**
- Copies the script to remote server
- Runs full setup on the remote server
- Handles all configuration automatically

### **Monitor Mode**
- Checks current DNS status
- Verifies SSL certificate status and expiration
- Tests website availability

## 🌐 **DNS Configuration Required**

Before running setup, ensure your DNS provider (GoDaddy) has these records:

```
Type: A
Name: @
Value: 38.54.14.154
TTL: 1 Hour

Type: A
Name: www
Value: 38.54.14.154
TTL: 1 Hour
```

## ⚡ **Quick Start**

1. **Fix your current domain issue:**
   ```bash
   # On your local machine
   cd scripts/domain
   bash domain-manager.sh deploy root@38.54.14.154
   ```

2. **For DNS diagnostics:**
   ```bash
   # On the server
   sudo bash domain-manager.sh diagnose
   ```

3. **For complete setup:**
   ```bash
   # On the server (after DNS is configured)
   sudo bash domain-manager.sh setup
   ```

## 📝 **Default Configuration**

- **Domain:** phimgg.com
- **Server IP:** 38.54.14.154
- **Email:** admin@phimgg.com
- **App Port:** 5000

All defaults can be overridden with command-line parameters.

## 📊 **Automated Features**

- **SSL Auto-Installation:** If DNS isn't ready during setup, the script sets up a cron job to automatically install SSL once DNS propagates
- **Security Headers:** Adds comprehensive security headers to nginx configuration
- **CORS Configuration:** Properly configured for PhimGG application
- **Log Management:** All operations are logged to `/var/log/filmflex/`

## 🔍 **Troubleshooting**

If you encounter issues:

1. **Run diagnostics first:**
   ```bash
   sudo bash domain-manager.sh diagnose
   ```

2. **Check logs:**
   ```bash
   tail -f /var/log/filmflex/domain-setup.log
   ```

3. **Test direct IP access:**
   ```bash
   curl http://38.54.14.154:5000
   ```

4. **Verify DNS manually:**
   ```bash
   dig phimgg.com A
   ```

5. **For nginx config errors:**
   ```bash
   sudo bash fix-nginx-config.sh
   ```

## 📁 **Files Created**

The script creates/manages these files:
- `/etc/nginx/sites-available/phimgg.com` - Nginx configuration
- `/var/log/filmflex/domain-setup.log` - Setup logs
- `/var/log/filmflex/ssl-automation.log` - SSL automation logs
- Auto-SSL cron job (temporary, removes itself after SSL installation)

## 🚨 **Emergency Fix**

If you're experiencing nginx configuration errors (like the current issue), run:

```bash
# On your server
sudo bash fix-nginx-config.sh
```

This unified approach ensures consistent, reliable domain management for your PhimGG deployment.
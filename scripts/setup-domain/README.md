# PhimGG Domain Setup Scripts

This folder contains comprehensive scripts for managing the `phimgg.com` domain setup, SSL configuration, and ongoing maintenance.

## 📁 Script Overview

### 🛠️ Setup Scripts
- **`simple-ssl-setup.sh`** - Simplified SSL setup with step-by-step process
- **`nginx-docker-setup.sh`** - Complete nginx Docker SSL setup (advanced)

### 🔧 Management Tools
- **`domain-manager.sh`** - Main domain management toolkit
- **`verify-dns.sh`** - DNS verification and propagation checker
- **`security-check.sh`** - Security analysis and SSL configuration audit

## 🚀 Quick Start

### Initial Domain Setup
```bash
# Run the simple SSL setup (recommended)
./simple-ssl-setup.sh

# Or run the advanced setup
./nginx-docker-setup.sh
```

### Daily Management
```bash
# Check overall domain health
./domain-manager.sh health

# Verify DNS configuration
./verify-dns.sh

# Run security audit
./security-check.sh
```

## 📋 Domain Manager Commands

The `domain-manager.sh` script is your main tool for domain management:

### Health Checks
```bash
./domain-manager.sh dns           # Check DNS resolution
./domain-manager.sh connectivity  # Test HTTP/HTTPS connectivity
./domain-manager.sh status        # Check server and services status
./domain-manager.sh health        # Run all health checks
./domain-manager.sh performance   # Run performance test
```

### SSL Management
```bash
./domain-manager.sh ssl-status    # Check SSL certificate status
./domain-manager.sh ssl-renew     # Renew SSL certificates
```

### Maintenance
```bash
./domain-manager.sh backup        # Backup domain configuration
./domain-manager.sh monitor       # Start real-time domain monitoring
./domain-manager.sh logs          # Show recent nginx logs
```

## 🔍 DNS Verification Commands

The `verify-dns.sh` script checks DNS configuration:

```bash
./verify-dns.sh                   # Run all DNS checks
./verify-dns.sh a                 # Check A record only
./verify-dns.sh www               # Check www subdomain
./verify-dns.sh propagation       # Check DNS propagation
./verify-dns.sh ttl               # Check TTL values
```

## 🔒 Security Analysis Commands

The `security-check.sh` script audits your domain security:

```bash
./security-check.sh               # Full security analysis
./security-check.sh ssl           # SSL certificate check
./security-check.sh headers       # Security headers check
./security-check.sh score         # Calculate security score
```

## 📊 Current Domain Status

- **Domain**: phimgg.com
- **Server IP**: 38.54.14.154
- **SSL Status**: ✅ Active with Let's Encrypt
- **HTTPS**: ✅ Working with HTTP redirect
- **Security Headers**: ✅ Configured

## 🔧 Configuration Files

The scripts work with these configuration files:
- `../../nginx/phimgg.com.conf` - Nginx site configuration
- `../../nginx/nginx.conf` - Main nginx configuration
- `../../docker-compose.nginx-ssl.yml` - Docker Compose for SSL setup
- `../../.env.nginx-ssl` - Environment variables

## 🚨 Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   ./domain-manager.sh ssl-status
   ./domain-manager.sh ssl-renew
   ```

2. **DNS Problems**
   ```bash
   ./verify-dns.sh propagation
   ```

3. **Container Issues**
   ```bash
   ./domain-manager.sh status
   docker compose -f ../../docker-compose.nginx-ssl.yml ps
   ```

### Emergency Commands

```bash
# Quick health check
./domain-manager.sh health

# View real-time logs
./domain-manager.sh logs

# Monitor domain status
./domain-manager.sh monitor
```

## 📈 Monitoring & Alerts

### Real-time Monitoring
```bash
./domain-manager.sh monitor
```
This will show a live dashboard with:
- HTTPS status
- Response times
- Container health
- Recent access logs

### Performance Testing
```bash
./domain-manager.sh performance
```

### Security Scoring
```bash
./security-check.sh score
```

## 🔄 Automated Tasks

### SSL Certificate Auto-Renewal
The SSL certificates automatically renew every 12 hours via the certbot container.

Manual renewal:
```bash
./domain-manager.sh ssl-renew
```

### Backup Configuration
```bash
./domain-manager.sh backup
```
Creates timestamped backups in `../../backups/domain-YYYYMMDD_HHMMSS/`

## 📞 Support Commands

### Get Help
```bash
./domain-manager.sh help
./verify-dns.sh help
./security-check.sh help
```

### Script Versions
All scripts are designed for:
- **Domain**: phimgg.com
- **Server**: Linux VPS with Docker
- **SSL**: Let's Encrypt certificates
- **Proxy**: Nginx in Docker container

## 🎯 Best Practices

1. **Daily Health Check**
   ```bash
   ./domain-manager.sh health
   ```

2. **Weekly Security Audit**
   ```bash
   ./security-check.sh
   ```

3. **Monthly Configuration Backup**
   ```bash
   ./domain-manager.sh backup
   ```

4. **Monitor During High Traffic**
   ```bash
   ./domain-manager.sh monitor
   ```

---

**🌐 Your PhimGG site is available at: https://phimgg.com**
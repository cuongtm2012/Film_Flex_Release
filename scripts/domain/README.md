# FilmFlex Domain Configuration Scripts

These scripts will help you set up and configure new domains for your FilmFlex installation.

## Scripts Included

1. **setup-domain.sh** - Main script to configure a new domain on your server
2. **check-dns-setup-ssl.sh** - Script to check DNS propagation and set up SSL
3. **configure-godaddy-dns.js** - Node.js script to automatically configure GoDaddy DNS settings

## Usage Instructions

### Basic Server Setup

To set up a new domain on your server:

```bash
# Copy these scripts to your production server
scp -r scripts/domain root@38.54.115.156:/var/www/filmflex/scripts/

# SSH to your server
ssh root@38.54.115.156

# Run the setup script (replace with your domain)
cd /var/www/filmflex
bash scripts/domain/setup-domain.sh phimgg.com
```

### Configure DNS with GoDaddy API

If you have GoDaddy API credentials, you can automate the DNS configuration:

```bash
# Install necessary dependencies
npm install axios

# Run the GoDaddy DNS configuration script
node scripts/domain/configure-godaddy-dns.js phimgg.com 38.54.115.156
```

### Manual DNS Configuration in GoDaddy Dashboard

1. Log in to your GoDaddy account
2. Go to the DNS management page for your domain
3. Add these records:
   - **A Record**: 
     - Type: A
     - Name: @ (represents the root domain)
     - Value: 38.54.115.156 (your server IP)
     - TTL: 1 Hour

   - **CNAME Record**:
     - Type: CNAME
     - Name: www
     - Value: phimgg.com
     - TTL: 1 Hour

### Checking DNS Propagation and Setting Up SSL

After DNS changes have been made, check propagation and set up SSL:

```bash
# Run this on your server to check DNS and set up SSL
bash scripts/domain/check-dns-setup-ssl.sh phimgg.com
```

## Common Issues

1. **DNS Propagation Takes Time**: Wait 24-48 hours for full propagation
2. **Let's Encrypt Rate Limits**: You can only request 5 certificates per domain per week
3. **Nginx Configuration**: Make sure port 80 is open on your server

## Manual SSL Configuration

If automatic SSL setup fails, you can manually configure SSL:

```bash
# Install Certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Request certificate
certbot --nginx -d phimgg.com -d www.phimgg.com
```
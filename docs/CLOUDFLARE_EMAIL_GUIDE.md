# PhimGG Email Service - Cloudflare Integration Guide

## Overview

This guide explains how to configure the email service in your PhimGG project to work with Cloudflare Workers, following the same pattern as your OAuth configuration.

## Configuration Options

Your project now supports two email configuration modes:

### 1. **Development Mode** (Local SendGrid)
- Uses SendGrid API directly from your server
- Requires `SENDGRID_API_KEY` in your local environment
- Set `USE_CLOUDFLARE_EMAIL=false` in `.env.development`

### 2. **Production Mode** (Cloudflare Worker)
- Routes email through your Cloudflare Worker
- SendGrid API key stored securely in Cloudflare Secrets
- Automatically enabled in production (`USE_CLOUDFLARE_EMAIL=true`)

## Setup Instructions

### Step 1: Configure Environment Variables

Your environment files have been updated:

**`.env.development`:**
```env
USE_CLOUDFLARE_EMAIL=false
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@filmflex.com
FROM_NAME=PhimGG
```

**`.env` (Production):**
```env
USE_CLOUDFLARE_EMAIL=true
FROM_EMAIL=noreply@filmflex.com
FROM_NAME=PhimGG
```

### Step 2: Configure Cloudflare Secrets

Run the updated setup script to configure your SendGrid API key in Cloudflare:

```bash
./scripts/setup-cloudflare-secrets.sh
```

This will prompt you to securely enter:
- Google OAuth credentials
- Facebook OAuth credentials
- **SendGrid API Key** (new)
- Session secret

### Step 3: Update Cloudflare Worker Routes

Update your `wrangler.toml` to include the email endpoint:

```toml
routes = [
  { pattern = "phimgg.com/api/auth/*", zone_name = "phimgg.com" },
  { pattern = "phimgg.com/api/email/*", zone_name = "phimgg.com" }
]
```

### Step 4: Deploy Your Cloudflare Worker

```bash
cd /path/to/your/project
wrangler deploy
```

## Email Service Features

### Supported Email Types

1. **Password Reset Emails**
   - Beautifully styled HTML templates
   - Secure reset links with expiration
   - Plain text fallback

2. **Welcome Emails**
   - Branded PhimGG design
   - Feature highlights
   - Engaging user onboarding

3. **Account Activation Emails**
   - Professional activation links
   - Clear instructions

### Email Templates

All emails feature:
- 🎬 PhimGG branding with movie theme
- Dark theme design matching your app
- Responsive HTML templates
- Plain text fallbacks
- Security warnings and instructions

## API Endpoint

### Cloudflare Worker Email Endpoint

**URL:** `https://phimgg.com/api/email/send`
**Method:** `POST`

**Request Body:**
```json
{
  "to": "user@example.com",
  "from": {
    "email": "noreply@filmflex.com",
    "name": "PhimGG"
  },
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>",
  "text": "Plain text content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

## Development vs Production

### Development Mode
```bash
# Your server will log:
📧 Sending email via local SendGrid...
📧 Email Service: ✅ Configured locally
```

### Production Mode
```bash
# Your server will log:
📧 Sending email via Cloudflare Worker...
📧 Email Service: ✅ Configured in Cloudflare Secrets
```

## Testing

### Test Email Functionality

1. **Local Development:**
   ```bash
   npm run dev
   # Trigger password reset to test email service
   ```

2. **Production:**
   ```bash
   # Test via your deployed application
   # Check Cloudflare Worker logs for email delivery
   ```

### Debugging

**Check Cloudflare Worker Logs:**
```bash
wrangler tail
```

**Verify Secrets:**
```bash
wrangler secret list
```

## Security Benefits

✅ **API Key Security:** SendGrid API key stored in Cloudflare Secrets, not in your repository
✅ **Environment Separation:** Different configurations for development and production
✅ **Centralized Management:** All secrets managed through Cloudflare dashboard
✅ **Automatic HTTPS:** All email API calls secured through Cloudflare's edge network

## Troubleshooting

### Common Issues

1. **Email not sending in production:**
   - Verify `SENDGRID_API_KEY` is set in Cloudflare Secrets
   - Check Cloudflare Worker logs: `wrangler tail`

2. **TypeScript errors:**
   - Ensure `@cloudflare/workers-types` is installed
   - Verify `worker/**/*.ts` is included in `tsconfig.json`

3. **CORS issues:**
   - Verify your domain is set correctly in `CLIENT_URL`
   - Check Cloudflare Worker CORS headers

### Support

For issues with:
- **SendGrid:** Check your SendGrid dashboard and API key permissions
- **Cloudflare:** Verify your Worker deployment and secrets configuration
- **Email delivery:** Check spam folders and SendGrid delivery logs

## Next Steps

1. Deploy your Cloudflare Worker with the new email functionality
2. Configure your SendGrid API key in Cloudflare Secrets
3. Test email functionality in both development and production
4. Monitor email delivery through SendGrid dashboard

Your email service is now fully integrated with your Cloudflare infrastructure! 🎬📧
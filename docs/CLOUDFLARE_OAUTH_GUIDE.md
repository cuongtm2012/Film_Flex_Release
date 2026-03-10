# Cloudflare Worker OAuth Implementation Guide

This guide provides a complete OAuth authentication system for your Cloudflare Worker with secure secret management.

## 🏗️ Architecture Overview

- **Secrets Storage**: OAuth credentials stored securely in Cloudflare Secrets (never in code)
- **OAuth Providers**: Google and Facebook authentication
- **Session Management**: JWT tokens with secure cookies
- **Security**: CSRF protection, secure headers, encrypted storage

## 📋 Prerequisites

1. Cloudflare account with Workers enabled
2. Google OAuth app configured in Google Cloud Console
3. Facebook app configured in Facebook Developer Console
4. Wrangler CLI installed globally

## 🚀 Quick Start

### Step 1: Login to Cloudflare
```bash
wrangler login
```

### Step 2: Set up OAuth Secrets (Secure Method)
Run our automated script:
```bash
./scripts/setup-cloudflare-secrets.sh
```

Or manually set secrets:
```bash
# Google OAuth
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET

# Facebook OAuth  
wrangler secret put FACEBOOK_APP_ID
wrangler secret put FACEBOOK_APP_SECRET

# Session security
wrangler secret put SESSION_SECRET
```

### Step 3: Configure OAuth Redirect URIs

#### Google Cloud Console:
- Go to APIs & Services → Credentials
- Edit your OAuth 2.0 Client
- Add redirect URI: `https://your-worker-domain.workers.dev/api/auth/google/callback`

#### Facebook Developer Console:
- Go to Facebook Login → Settings
- Add redirect URI: `https://your-worker-domain.workers.dev/api/auth/facebook/callback`

### Step 4: Update wrangler.toml
```toml
name = "filmflex-auth"
main = "worker/index.ts"
compatibility_date = "2024-01-01"

[vars]
NODE_ENV = "production"
CLIENT_URL = "https://phimgg.com"

routes = [
  { pattern = "phimgg.com/api/auth/*", zone_name = "phimgg.com" }
]
```

### Step 5: Deploy the Worker
```bash
wrangler deploy
```

## 🔐 Security Features

### Secret Management
- ✅ OAuth credentials encrypted in Cloudflare Secrets Store
- ✅ Never stored in code or version control
- ✅ Accessible only via Worker environment at runtime

### Authentication Security
- ✅ CSRF protection with state parameters
- ✅ Secure JWT tokens with HMAC-SHA256 signing
- ✅ HttpOnly, Secure, SameSite cookies
- ✅ Token expiration (24 hours default)

### Network Security  
- ✅ CORS headers configured properly
- ✅ HTTPS-only in production
- ✅ Encrypted token storage

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | GET | Initiate Google OAuth flow |
| `/api/auth/google/callback` | GET | Google OAuth callback handler |
| `/api/auth/facebook` | GET | Initiate Facebook OAuth flow |
| `/api/auth/facebook/callback` | GET | Facebook OAuth callback handler |
| `/api/auth/logout` | GET | Logout and clear auth token |

## 🧪 Testing the Implementation

### Test Google OAuth:
1. Visit: `https://your-worker-domain.workers.dev/api/auth/google`
2. Complete Google authentication
3. Should redirect to your CLIENT_URL with auth cookie set

### Test Facebook OAuth:
1. Visit: `https://your-worker-domain.workers.dev/api/auth/facebook`  
2. Complete Facebook authentication
3. Should redirect to your CLIENT_URL with auth cookie set

## 🛠️ Management Commands

```bash
# View all configured secrets (names only)
wrangler secret list

# Delete a specific secret
wrangler secret delete GOOGLE_CLIENT_ID

# Update a secret
wrangler secret put GOOGLE_CLIENT_ID

# View Worker logs
wrangler tail

# Deploy after changes
wrangler deploy
```

## 🔍 Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**
   - Check OAuth app settings match Worker domain
   - Ensure HTTPS is used in production

2. **"Secrets not found"**  
   - Verify secrets are uploaded: `wrangler secret list`
   - Check secret names match exactly

3. **CORS errors**
   - Verify CLIENT_URL in wrangler.toml matches your frontend domain
   - Check Worker route configuration

4. **Authentication fails**
   - Check Worker logs: `wrangler tail`
   - Verify OAuth app is in "Live" mode (not Development)

## 🔒 Best Practices

### Never commit these to Git:
- ❌ OAuth Client IDs/Secrets
- ❌ Session secrets  
- ❌ API keys or tokens

### Always use:
- ✅ Cloudflare Secrets Store for sensitive data
- ✅ Environment variables for non-sensitive config
- ✅ HTTPS in production
- ✅ Secure cookie settings
- ✅ Token expiration

### Production Checklist:
- [ ] Secrets uploaded via `wrangler secret put`
- [ ] OAuth apps configured with correct redirect URIs
- [ ] Facebook app in "Live" mode
- [ ] Worker deployed to production
- [ ] CORS headers configured properly
- [ ] Test both OAuth flows end-to-end

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Facebook OAuth Guide](https://developers.facebook.com/docs/facebook-login)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
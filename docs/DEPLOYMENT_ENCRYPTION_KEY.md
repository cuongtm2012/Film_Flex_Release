# Production Deployment Checklist - ENCRYPTION_KEY

## ⚠️ CRITICAL: Required for OAuth SSO

Production deployment **MUST** include `ENCRYPTION_KEY` environment variable for OAuth to work.

---

## Quick Fix (Manual)

If OAuth fails after deployment with error `Unknown authentication strategy "google"`:

```bash
# SSH to production server
ssh root@38.54.14.154

# Stop and remove current container
docker stop filmflex-app
docker rm filmflex-app

# Recreate with ENCRYPTION_KEY
docker run -d \
  --name filmflex-app \
  --network film_flex_release_filmflex-network \
  -p 5000:5000 \
  -e ELASTICSEARCH_NODE=http://filmflex-elasticsearch:9200 \
  -e NODE_ENV=production \
  -e CORS_CREDENTIALS=true \
  -e "CORS_ALLOWED_HEADERS=Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma" \
  -e DOMAIN=38.54.14.154 \
  -e DATABASE_URL=postgresql://filmflex:filmflex2024@postgres:5432/filmflex \
  -e SERVER_IP=38.54.14.154 \
  -e ELASTICSEARCH_ENABLED=true \
  -e PUBLIC_URL=http://38.54.14.154:5000 \
  -e PORT=5000 \
  -e ALLOWED_ORIGINS=* \
  -e CORS_ORIGIN=* \
  -e SESSION_SECRET=filmflex_production_secret_2024 \
  -e "CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS" \
  -e CLIENT_URL=* \
  -e ENCRYPTION_KEY=8649861dce96bd331b012b8f330d5d075d4307758a23d27182fd008e726938c3 \
  -v /var/www/filmflex/dist:/app/dist:ro \
  --restart unless-stopped \
  film_flex_release-app

# Verify
docker logs filmflex-app --tail 20 | grep OAuth
```

Expected output:
```
✅ Google OAuth enabled - credentials loaded from database
✅ Facebook OAuth enabled - credentials loaded from database
```

---

## For GitHub Actions

Add to deployment workflow secrets:

1. Go to GitHub repo → Settings → Secrets → Actions
2. Add new secret:
   - Name: `ENCRYPTION_KEY`
   - Value: `8649861dce96bd331b012b8f330d5d075d4307758a23d27182fd008e726938c3`

3. Update deployment script to include:
```bash
-e ENCRYPTION_KEY=${{ secrets.ENCRYPTION_KEY }} \
```

---

## Why This Is Required

- OAuth credentials (Google/Facebook client secrets) are **encrypted** in database
- Server needs `ENCRYPTION_KEY` to **decrypt** them
- Without it: `getAllSettings()` returns empty → strategies not initialized
- Result: `Error: Unknown authentication strategy "google"`

---

## Verification

After deployment, check logs:
```bash
docker logs filmflex-app 2>&1 | grep -E '(OAuth|ENCRYPTION)'
```

Should see:
- ✅ `[OAuth Init] Loading credentials from database...`
- ✅ `✅ Google OAuth enabled`
- ✅ `✅ Facebook OAuth enabled`

Should NOT see:
- ❌ `ℹ️  Google OAuth disabled - no credentials`
- ❌ `Error: Unknown authentication strategy`

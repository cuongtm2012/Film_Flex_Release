# CORS Fix for FilmFlex Application

## Problem
The FilmFlex application was successfully deployed with PostgreSQL authentication working, but users were getting **"Error: Not allowed by CORS"** errors when trying to access the application. This was occurring at `server/index.ts:51:14`.

## Root Cause Analysis
1. **Syntax Error**: Missing closing brace in CORS origin checking logic at line 64
2. **Missing Environment Variable**: `ALLOWED_ORIGINS` was not set in the `.env` file
3. **Restrictive CORS Policy**: The CORS configuration was too restrictive for production deployment
4. **Insufficient Debugging**: Limited logging made it difficult to troubleshoot CORS issues

## Solutions Implemented

### 1. Fixed Syntax Error
**File**: `server/index.ts`
**Issue**: Missing closing brace in IP address checking logic
```typescript
// BEFORE (broken):
if (origin.includes('154.205.142.255')) {
  return callback(null, true);    }

// AFTER (fixed):
if (origin.includes('154.205.142.255')) {
  return callback(null, true);
}
```

### 2. Updated Environment Configuration
**File**: `.env`
**Changes**:
- Set `NODE_ENV=production` (was development)
- Added `ALLOWED_ORIGINS=*` to allow all origins during initial deployment

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://filmflex:filmflex2024@localhost:5432/filmflex
SESSION_SECRET=filmflex_dev_secret_2024
ALLOWED_ORIGINS=*
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 3. Enhanced CORS Debugging
**File**: `server/index.ts`
**Improvements**:
- Added comprehensive logging for CORS checks
- Enhanced error messages with detailed information
- Added multiple checkpoints for wildcard origin handling

```typescript
console.log('🌐 CORS Check - Origin:', origin);
console.log('🔧 ALLOWED_ORIGINS env:', process.env.ALLOWED_ORIGINS);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
```

### 4. Created Quick Fix Script
**File**: `scripts/deployment/quick-cors-fix.sh`
**Features**:
- Automated application restart with PM2
- CORS configuration verification
- Application health checks
- Enhanced logging and monitoring

## Deployment Instructions

### Option 1: Use the Quick Fix Script (Recommended)
```bash
# Copy and run the quick fix script on the server
sudo ./scripts/deployment/quick-cors-fix.sh
```

### Option 2: Manual Steps
```bash
# 1. Navigate to application directory
cd /var/www/filmflex

# 2. Restart PM2 process
pm2 delete filmflex
pm2 start npm --name filmflex --interpreter bash -- start
pm2 save

# 3. Monitor logs
pm2 logs filmflex
```

## Testing CORS Configuration

### Test with curl
```bash
# Test phimgg.com origin
curl -H "Origin: https://phimgg.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:5000/ -v

# Test IP address origin  
curl -H "Origin: http://154.205.142.255" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS http://localhost:5000/ -v
```

### Test with Browser
1. Navigate to `http://phimgg.com`
2. Open browser developer tools (F12)
3. Check for CORS errors in console
4. Verify network requests are successful

## Monitoring and Logs

### PM2 Logs
```bash
# View real-time logs
pm2 logs filmflex

# View specific number of lines
pm2 logs filmflex --lines 50

# View error logs only
pm2 logs filmflex --err
```

### Application Health
```bash
# Check if application is running
pm2 status

# Test application endpoint
curl http://localhost:5000/

# Check port availability
netstat -tuln | grep :5000
```

## Security Considerations

### Current Setting (Development/Initial Deployment)
- `ALLOWED_ORIGINS=*` allows **ALL** origins
- This is convenient for initial deployment and testing
- **Should be restricted** for production use

### Recommended Production Settings
After successful deployment, update `.env`:
```env
ALLOWED_ORIGINS=https://phimgg.com,https://www.phimgg.com,http://154.205.142.255:5000
```

### Additional Security Headers
The server already includes:
- `credentials: true` for cookie support
- Specific allowed methods and headers
- Proper cache control for static assets

## Troubleshooting

### Common Issues

#### 1. Still Getting CORS Errors
- **Check**: PM2 process restarted successfully
- **Check**: `.env` file has `ALLOWED_ORIGINS=*`
- **Check**: No syntax errors in `server/index.ts`
- **Solution**: Run `pm2 restart filmflex` and check logs

#### 2. Application Not Starting
- **Check**: Port 5000 is not in use by another process
- **Check**: Database connection is working
- **Solution**: Use `netstat -tuln | grep :5000` and `pm2 logs filmflex`

#### 3. Logs Not Showing CORS Debug Info
- **Check**: Application restarted after code changes
- **Check**: `NODE_ENV` is set correctly
- **Solution**: Force restart with `pm2 delete filmflex && pm2 start...`

### Debug Commands
```bash
# Check environment variables
pm2 show filmflex | grep env

# Test database connection
sudo -u postgres psql -d filmflex -c "SELECT version();"

# Check application process
ps aux | grep node

# Check nginx configuration (if applicable)
nginx -t && systemctl status nginx
```

## Next Steps

After CORS fix is deployed and working:

1. **✅ Test admin login** with credentials (admin/Cuongtm2012$)
2. **✅ Verify application functionality** 
3. **✅ Run movie import process**
4. **✅ Configure proper CORS origins** for production security
5. **✅ Set up SSL/HTTPS** for production domain

## Files Modified

- `server/index.ts` - Fixed CORS configuration and added debugging
- `.env` - Added ALLOWED_ORIGINS and set NODE_ENV to production
- `scripts/deployment/quick-cors-fix.sh` - New automated fix script

## Success Indicators

✅ **Application starts without errors**
✅ **No CORS errors in browser console**  
✅ **PM2 shows 'online' status**
✅ **Website loads at http://phimgg.com**
✅ **API endpoints respond correctly**
✅ **Enhanced logging shows CORS decisions**

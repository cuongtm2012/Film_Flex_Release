# FilmFlex Production Deployment Guide

## Fixed ES Module Import Issues ✅

The application was experiencing runtime errors due to ES module import issues. The following fixes have been applied:

### Issues Fixed:
1. **Directory Import Error**: `Error: Directory import '/var/www/filmflex/dist/server/routes' is not supported`
   - **Fix**: Changed `import { registerRoutes } from "./routes"` to `import { registerRoutes } from "./routes.js"`

2. **Missing .js Extensions**: ES modules require explicit file extensions for local imports
   - **Files Fixed**:
     - `server/index.ts` - All local imports now use `.js` extensions
     - `server/routes.ts` - Admin and SEO route imports fixed
     - `server/auth.ts` - Storage and config imports fixed
     - `server/storage.ts` - Database imports fixed
     - `server/vite.ts` - Vite config import fixed
     - `server/routes/admin/index.ts` - Admin route imports fixed
     - `server/routes/admin/featured-sections.ts` - Middleware import fixed
     - `server/routes/admin/movies.ts` - Storage and middleware imports fixed
     - `server/routes/seo.ts` - Storage import fixed

### Deployment Options:

## Option 1: Quick Redeploy with Branch Support (Recommended)

The enhanced `quick-redeploy.sh` script now supports:
- Automatic branch switching
- ES module import fixes
- Enhanced error handling
- Multiple build fallbacks

### Usage:
```bash
# Deploy Production_Util branch (default)
./quick-redeploy.sh

# Deploy specific branch
./quick-redeploy.sh Production_Util

# Deploy main branch
./quick-redeploy.sh main
```

## Option 2: Manual Steps

If you prefer manual control:

1. **SSH into production server**
2. **Switch to target branch:**
   ```bash
   cd /root/Film_Flex_Release
   git fetch origin
   git checkout Production_Util
   git pull origin Production_Util
   ```
3. **Run deployment:**
   ```bash
   chmod +x quick-redeploy.sh
   ./quick-redeploy.sh
   ```

## What's Fixed:

✅ **ES Module Import Issues**: All directory imports converted to explicit file imports  
✅ **Build Process**: TypeScript compilation now works correctly  
✅ **Runtime Errors**: No more "Directory import not supported" errors  
✅ **Branch Switching**: Automatic branch checkout and pull  
✅ **Error Handling**: Enhanced rollback on failure  
✅ **Health Checks**: Improved verification process  

## Deployment Features:

- **Smart Dependency Management**: Only reinstalls when package.json changes
- **Multiple Build Fallbacks**: Primary build → Separate builds → ESBuild
- **Automatic Backup**: Creates backup before deployment
- **Health Checks**: Verifies application is running after deployment
- **Enhanced Logging**: Detailed logs for troubleshooting
- **Rollback on Failure**: Automatically restores previous version on error

## Verification:

After deployment, the script will:
1. Check PM2 process status
2. Perform HTTP health checks
3. Display recent logs
4. Show application URL

## Notes:

- **Database Safe**: This script does NOT run database migrations
- **Quick Deployment**: Only updates code, preserves database and uploads
- **Production Ready**: Includes proper error handling and rollback
- **Branch Aware**: Can deploy any branch with single command

## Troubleshooting:

If deployment fails:
1. Check the log file (displayed in output)
2. Verify git repository access
3. Ensure branch exists (locally or remotely)
4. Check PM2 status: `pm2 list`
5. View PM2 logs: `pm2 logs filmflex`

The script automatically attempts to restore the previous version on failure.

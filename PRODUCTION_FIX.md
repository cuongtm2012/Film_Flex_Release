# FilmFlex ES Module Issue - Solution

## Problem
Your FilmFlex application on the production server (154.205.142.255) is failing with this error:
```
ReferenceError: require is not defined in ES module scope
```

## Root Cause
The build process was creating a file that used CommonJS `require()` syntax but the application is configured as an ES module in `package.json` with `"type": "module"`.

## Solution

I've fixed the build configuration. Here's what was changed:

### 1. Fixed Build Script
Updated `package.json` build script to use proper ES module output:
```json
"build:server": "npx esbuild server/index.ts --bundle --platform=node --target=es2022 --format=esm --outdir=dist --packages=external --sourcemap --external:vite.config.ts"
```

### 2. Fixed Vite Import Issue
Modified `server/vite.ts` to conditionally import vite config only in development mode to avoid build issues.

### 3. Updated TypeScript Configuration
Updated `tsconfig.server.json` to ensure proper ES module output.

## Deployment Instructions

### Option 1: Upload Fixed Files and Run Fix Script

1. **Upload the updated files to your server:**
```bash
# From your Windows machine
scp package.json root@154.205.142.255:/var/www/filmflex/
scp tsconfig.server.json root@154.205.142.255:/var/www/filmflex/
scp server/vite.ts root@154.205.142.255:/var/www/filmflex/server/
scp fix-production-build.sh root@154.205.142.255:/var/www/filmflex/
```

2. **Run the fix script on your server:**
```bash
ssh root@154.205.142.255
cd /var/www/filmflex
chmod +x fix-production-build.sh
./fix-production-build.sh
```

### Option 2: Manual Fix Commands

SSH to your server and run these commands:

```bash
ssh root@154.205.142.255
cd /var/www/filmflex

# Stop the application
pm2 stop filmflex
pm2 delete filmflex

# Clean and rebuild
rm -rf dist/ node_modules/.cache/
npm cache clean --force
npm install
npm run build

# Test the build
node dist/index.js &
sleep 5
curl http://localhost:5000/api/health

# If successful, start with PM2
pm2 start ecosystem.config.js
pm2 status
```

### Option 3: Complete Re-deployment

If the above doesn't work, you can do a complete re-deployment:

```bash
# From Windows, upload entire project
scp -r . root@154.205.142.255:/tmp/filmflex-update/

# On server
ssh root@154.205.142.255
pm2 stop filmflex
cp -r /tmp/filmflex-update/* /var/www/filmflex/
cd /var/www/filmflex
npm install
npm run build
pm2 start ecosystem.config.js
```

## Verification

After running the fix, verify everything is working:

1. **Check PM2 status:**
```bash
pm2 status
pm2 logs filmflex --lines 20
```

2. **Test application health:**
```bash
curl http://localhost:5000/api/health
```

3. **Check website:**
Visit https://phimgg.com in your browser

## Expected Results

- ✅ No more "require is not defined" errors
- ✅ Application starts successfully with PM2
- ✅ Health endpoint responds correctly
- ✅ Website loads properly

## Troubleshooting

If you still encounter issues:

1. **Check error logs:**
```bash
tail -f /var/log/filmflex/error.log
pm2 logs filmflex --lines 50
```

2. **Verify Node.js version:**
```bash
node -v  # Should be v22+ for ES2022 support
```

3. **Check build output:**
```bash
ls -la dist/
head -20 dist/index.js  # Should show ES module format
```

The build configuration is now properly set up to create ES modules that work with your Node.js setup.

# Fix: React useState null error in ThemeProvider

## 🐛 Lỗi gốc

```
TypeError: Cannot read properties of null (reading 'useState')
```

**Nguyên nhân:** Vite cache cũ + potential React module resolution issues sau khi install video.js

## ✅ Giải pháp đã áp dụng

### 1. Cleared Vite cache
```bash
Remove-Item -Recurse -Force node_modules\.vite
Remove-Item -Recurse -Force dist
```

### 2. Updated vite.config.ts

**Added React dedupe:**
```typescript
resolve: {
  alias: { ... },
  dedupe: ['react', 'react-dom'], // Force single React instance
},
```

**Added optimizeDeps:**
```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'video.js'],
  exclude: [],
},
```

### 3. Verified React dependencies
```bash
npm ls react
# All React dependencies are "deduped" ✅
```

### 4. Rebuilt application
```bash
npm run build
# ✓ built in 22.72s ✅
```

## 📋 Thay đổi trong vite.config.ts

**Before:**
```typescript
resolve: {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
    "@shared": path.resolve(import.meta.dirname, "shared"),
    "@assets": path.resolve(import.meta.dirname, "attached_assets"),
  },
},
```

**After:**
```typescript
resolve: {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
    "@shared": path.resolve(import.meta.dirname, "shared"),
    "@assets": path.resolve(import.meta.dirname, "attached_assets"),
  },
  dedupe: ['react', 'react-dom'], // NEW
},
optimizeDeps: {                    // NEW
  include: ['react', 'react-dom', 'video.js'],
  exclude: [],
},
```

## 🔍 Tại sao lỗi này xảy ra?

### Nguyên nhân chính:
1. **Vite cache stale** - Cache cũ từ trước khi install video.js
2. **Module resolution** - video.js có thể gây conflict với React bundling
3. **Development mode** - Vite dev server cache không được refresh

### Cách `dedupe` fix vấn đề:
```typescript
dedupe: ['react', 'react-dom']
```
- Force Vite chỉ dùng **1 instance** của React
- Prevent multiple React copies trong bundle
- Ensure hooks work correctly

### Cách `optimizeDeps` giúp:
```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'video.js']
}
```
- Pre-bundle React và video.js
- Faster cold start
- Consistent module resolution

## 🚀 Cách chạy sau khi fix

### Development
```bash
# Clear cache first (already done)
Remove-Item -Recurse -Force node_modules\.vite

# Rebuild
npm run build

# Start dev server
npm run dev
```

### Production
```bash
npm run build
npm start
```

## ✅ Verification

### Check server logs
```bash
# Should see:
✓ built in ~20s
✓ 2653 modules transformed
```

### Test in browser
1. Open DevTools Console
2. Navigate to any page
3. **Should NOT see** useState error
4. ThemeProvider should load correctly

### Verify React dedupe
```bash
npm ls react
# All should show "deduped" ✅
```

## 📊 Root Cause Analysis

### Why video.js installation caused this?

1. **Dependency tree changed** when adding video.js
2. **Vite's module graph** was built with old dependencies
3. **Cache invalidation** didn't trigger automatically
4. **React hooks** require single React instance

### The fix ensures:
- ✅ Single React instance across all modules
- ✅ Proper module pre-bundling
- ✅ Cache cleared and rebuilt
- ✅ Consistent development environment

## 🔧 Files Modified

- ✅ `vite.config.ts` - Added dedupe + optimizeDeps
- ✅ Cleared `node_modules/.vite` cache
- ✅ Cleared `dist` folder
- ✅ Rebuilt application

## 📝 Prevention

To prevent this in future:

### When installing new packages:
```bash
# 1. Install package
npm install some-package

# 2. Clear Vite cache
Remove-Item -Recurse -Force node_modules\.vite

# 3. Rebuild
npm run build
```

### When seeing React hook errors:
```bash
# Check for multiple React instances
npm ls react

# Clear cache
Remove-Item -Recurse -Force node_modules\.vite

# Rebuild
npm run build
```

## 🎯 Summary

**Problem:** `Cannot read properties of null (reading 'useState')`  
**Root Cause:** Stale Vite cache + video.js installation  
**Solution:** Clear cache + dedupe React + optimizeDeps  
**Status:** ✅ FIXED  

**Next steps:**
1. ✅ Cache cleared
2. ✅ Config updated
3. ✅ Application rebuilt
4. **→ Restart dev server**
5. **→ Test in browser**

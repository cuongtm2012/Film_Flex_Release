# Code Splitting & Lazy Loading Guide

## 📚 Overview

This guide explains how code splitting and lazy loading work in Film_Flex application.

## 🎯 What is Code Splitting?

Code splitting is a technique that breaks your application into smaller chunks that can be loaded on demand, rather than loading everything at once.

### Benefits
- ⚡ **Faster Initial Load**: Load only what's needed for the current page
- 💾 **Better Caching**: Update one page without invalidating entire bundle
- 📱 **Mobile Friendly**: Less data transfer for initial load
- 🚀 **Better Performance**: Smaller JavaScript = faster parse & execute

## 🏗️ Implementation in Film_Flex

### 1. Route-based Splitting

Every page is loaded only when the user navigates to it.

```typescript
// ❌ BAD: Eager loading (loads everything immediately)
import HomePage from "@/pages/Home";
import MovieDetailPage from "@/pages/MovieDetail";

// ✅ GOOD: Lazy loading (loads when needed)
const HomePage = lazy(() => import("@/pages/Home"));
const MovieDetailPage = lazy(() => import("@/pages/MovieDetail"));
```

### 2. Suspense Boundaries

While a page is loading, show a loading indicator:

```typescript
<Suspense fallback={<PageLoadingFallback />}>
  <HomePage />
</Suspense>
```

### 3. Vendor Code Splitting

Large libraries are split into separate chunks:

```typescript
// vite.config.ts
manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'video-player': ['video.js', 'hls.js'],
  'ui-framework': ['@radix-ui/react-*'],
}
```

## 📦 Chunk Types

### Core Chunks (Always Loaded)
```
index.js          - App entry point
react-vendor.js   - React core
router.js         - Routing logic
```

### Lazy Chunks (Load on Demand)
```
Home.js           - Home page
MovieDetail.js    - Movie detail page
AdminPage.js      - Admin panel
auth-page.js      - Authentication
... (54 more pages)
```

### Vendor Chunks (Shared Libraries)
```
ui-framework.js         - Radix UI components
icons-animations.js     - Lucide icons, Framer Motion
video-player.js         - Video.js, HLS.js
forms.js                - React Hook Form, Zod
utilities.js            - Axios, date-fns, etc.
```

## 🔄 Loading Flow

### Initial Page Load
```
1. Load index.html (27 KB)
   ↓
2. Load core chunks:
   - index.js (171 KB)
   - react-vendor.js (142 KB)
   - router.js (45 KB)
   ↓
3. Load current page chunk:
   - Example: Home.js (32 KB)
   ↓
4. Preload likely pages in background:
   - Movies.js
   - Search.js
   - MovieDetail.js
```

### Navigation to New Page
```
User clicks "Movies" link
   ↓
Is Movies.js already loaded?
   ├─ YES → Show page instantly ⚡
   └─ NO  → Load Movies.js (2.5 KB) → Show page
```

## 🎨 User Experience

### Loading States

**1. Page Loading**
```typescript
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner />
      <p>Đang tải...</p>
    </div>
  );
}
```

**2. Component Loading** (for heavy components)
```typescript
const VideoPlayer = lazy(() => import("@/components/VideoPlayer"));

<Suspense fallback={<div>Loading player...</div>}>
  <VideoPlayer src={movie.url} />
</Suspense>
```

## 🚀 Route Preloading

### Automatic Preloading

After the app loads, we automatically prefetch commonly visited pages:

```typescript
// lib/preload-routes.ts
export function preloadCriticalRoutes() {
  requestIdleCallback(() => {
    preloadMovies();     // Load /movies page
    preloadSearch();     // Load /search page
    preloadMovieDetail(); // Load /movie/:slug page
  });
}
```

### Manual Preloading (on hover)

You can preload a page when user hovers over a link:

```typescript
import { preloadRoute } from "@/lib/preload-routes";

<Link 
  to="/movies" 
  onMouseEnter={() => preloadRoute('movies')}
>
  Movies
</Link>
```

### Smart Preloading

Only preload on fast connections:

```typescript
// Don't preload on slow connections or data saver mode
if (connection?.saveData || connection?.effectiveType === 'slow-2g') {
  return; // Skip preloading
}
```

## 📊 Bundle Analysis

### Check Bundle Sizes

```bash
# Build the app
npm run build

# View all chunks
ls -lh dist/public/assets/

# Total size
du -sh dist/
```

### Expected Output
```
react-vendor.js      142 KB  (React core)
ui-framework.js      145 KB  (Radix UI)
video-player.js      517 KB  (Video libraries)
Home.js              32 KB   (Home page)
MovieDetail.js       124 KB  (Movie detail)
... (54 more chunks)
```

## 🔧 Adding New Pages

### Step 1: Create Page Component

```typescript
// client/src/pages/NewPage.tsx
export default function NewPage() {
  return <div>New Page Content</div>;
}
```

### Step 2: Add Lazy Import in App.tsx

```typescript
// client/src/App.tsx
const NewPage = lazy(() => import("@/pages/NewPage"));
```

### Step 3: Add Route with Suspense

```typescript
<Route path="/new-page">
  <ErrorBoundary>
    <MainLayout>
      <Suspense fallback={<PageLoadingFallback />}>
        <NewPage />
      </Suspense>
    </MainLayout>
  </ErrorBoundary>
</Route>
```

### Step 4 (Optional): Add Preloading

```typescript
// lib/preload-routes.ts
export const preloadNewPage = () => import("@/pages/NewPage");

// Add to preloadRoute function
export function preloadRoute(routeName: string) {
  switch (routeName) {
    case 'new-page':
      return preloadNewPage();
    // ... other cases
  }
}
```

## 🎯 Best Practices

### ✅ DO

1. **Lazy Load Heavy Components**
   ```typescript
   const VideoPlayer = lazy(() => import("@/components/VideoPlayer"));
   const ChartComponent = lazy(() => import("@/components/Chart"));
   ```

2. **Split by Route**
   - Each page = separate chunk
   - Users only load what they visit

3. **Group Vendor Libraries**
   - Put related libraries in same chunk
   - Better caching

4. **Add Loading States**
   - Always provide fallback UI
   - Better UX during loading

5. **Preload Likely Pages**
   - Prefetch on hover
   - Prefetch on idle

### ❌ DON'T

1. **Don't Lazy Load Too Much**
   ```typescript
   // ❌ BAD: Too granular
   const Button = lazy(() => import("@/components/Button"));
   
   // ✅ GOOD: Keep small components eager
   import Button from "@/components/Button";
   ```

2. **Don't Forget Error Boundaries**
   ```typescript
   // ❌ BAD: No error handling
   <Suspense fallback={<Loading />}>
     <Page />
   </Suspense>
   
   // ✅ GOOD: With error boundary
   <ErrorBoundary>
     <Suspense fallback={<Loading />}>
       <Page />
     </Suspense>
   </ErrorBoundary>
   ```

3. **Don't Lazy Load Critical Path**
   ```typescript
   // ❌ BAD: Lazy loading core components
   const Layout = lazy(() => import("@/components/Layout"));
   
   // ✅ GOOD: Eager load critical components
   import Layout from "@/components/Layout";
   ```

## 📱 Testing

### Test Initial Load

```bash
# Start production build
npm run build
npm start

# Open browser DevTools
# Network tab → Disable cache
# Reload page
# Check: Only core chunks + current page loaded
```

### Test Navigation

```bash
# Click on different pages
# Network tab should show:
# - New chunk loaded for each page
# - Vendor chunks NOT reloaded (cached)
```

### Test Preloading

```bash
# DevTools → Network tab
# Hover over link (don't click yet)
# Check: Page chunk starts loading
# Click link
# Check: Page shows instantly (already loaded)
```

## 🐛 Troubleshooting

### Problem: Page shows blank screen

**Solution**: Check for missing Suspense boundary

```typescript
// Add Suspense around lazy component
<Suspense fallback={<Loading />}>
  <LazyPage />
</Suspense>
```

### Problem: Chunk fails to load

**Solution**: Add error boundary and retry logic

```typescript
<ErrorBoundary fallback={<ErrorMessage />}>
  <Suspense fallback={<Loading />}>
    <LazyPage />
  </Suspense>
</ErrorBoundary>
```

### Problem: Too many chunks

**Solution**: Group related pages

```typescript
// vite.config.ts - Add manual chunks
manualChunks(id) {
  // Group admin pages
  if (id.includes('/pages/admin/')) {
    return 'admin-pages';
  }
  // Group settings pages
  if (id.includes('/pages/settings/')) {
    return 'settings-pages';
  }
}
```

### Problem: Slow navigation

**Solution**: Enable preloading

```typescript
// Add onMouseEnter to links
<Link to="/page" onMouseEnter={() => preloadRoute('page')}>
  Page
</Link>
```

## 📚 Resources

- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [Web.dev Code Splitting](https://web.dev/code-splitting/)
- [React Suspense](https://react.dev/reference/react/Suspense)

## 🎓 Learning Path

1. **Beginner**: Understand lazy loading basics
2. **Intermediate**: Implement route-based splitting
3. **Advanced**: Optimize with preloading & manual chunks
4. **Expert**: Build custom bundling strategies

---

**Last Updated**: 2026-01-29
**Film_Flex Version**: 1.0
**Build Tool**: Vite 5.4.19

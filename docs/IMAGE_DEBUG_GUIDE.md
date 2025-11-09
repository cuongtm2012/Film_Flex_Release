# Image Loading Debug Guide

## Vấn đề: "Failed to load image"

### ✅ Đã kiểm tra

1. **Database URLs**: ✅ Correct
   ```
   https://phimimg.com/upload/vod/20250413-1/2fbd9d9edd3f5981d688e346b706ab9a.jpg
   ```

2. **URL Accessibility**: ✅ All images return 200 OK

3. **Transformer Logic**: ✅ Fixed to preserve full URLs

### 🔍 Cần kiểm tra trên Frontend

#### 1. Mở DevTools Console
```javascript
// Check API response
fetch('/api/movies/recommended')
  .then(r => r.json())
  .then(data => {
    console.log('First movie:', data[0]);
    console.log('thumbUrl:', data[0].thumbUrl);
    console.log('posterUrl:', data[0].posterUrl);
    console.log('thumb_url:', data[0].thumb_url);
    console.log('poster_url:', data[0].poster_url);
  });
```

#### 2. Kiểm tra Network Tab
- Filter: `Img`
- Xem URLs nào đang được request
- Check status code (should be 200)
- Check for CORS errors

#### 3. Common Issues

**Issue 1: CORS Error**
```
Access to fetch at 'https://phimimg.com/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solution**: Images should work (phimimg.com allows CORS), but if blocked:
- Add image proxy in backend
- Or use CORS proxy

**Issue 2: Wrong Field**
Frontend using `movie.thumbUrl` but API returns `movie.thumb_url`

**Solution**: Check `client/src/components/MovieCard.tsx` (or similar):
```tsx
// Should work with both formats
<img src={movie.thumbUrl || movie.thumb_url || '/placeholder-movie.svg'} />
```

**Issue 3: Https → Http mixed content**
Production on HTTPS but loading HTTP images

**Solution**: All phimimg.com URLs are HTTPS ✅

#### 4. Test Individual Image
Open in browser:
```
https://phimimg.com/upload/vod/20250413-1/2fbd9d9edd3f5981d688e346b706ab9a.jpg
```

Should load successfully.

### 🛠️ Quick Fix

If images still failing, add error handler to `<img>` tags:

```tsx
<img 
  src={movie.thumbUrl || movie.thumb_url || '/placeholder-movie.svg'}
  onError={(e) => {
    console.error('Failed to load:', e.currentTarget.src);
    e.currentTarget.src = '/placeholder-movie.svg';
  }}
  alt={movie.name}
/>
```

### 📊 Validation Scripts

Run these to verify:

```bash
# Check DB URLs
npx tsx scripts/check-image-urls.ts

# Validate URLs are accessible
npx tsx scripts/validate-image-urls.ts

# Test API response (with server running)
npx tsx scripts/test-api-response.ts
```

### ✅ Expected Results

All scripts should show:
- ✅ URLs are valid HTTPS links
- ✅ URLs return 200 OK
- ✅ API returns both snake_case and camelCase fields

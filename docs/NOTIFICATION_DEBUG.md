# Notification Button Debug Guide

## 🔍 Kiểm Tra Notification Button

### 1. Mở Console và Check Logs

Sau khi login, kiểm tra console log:

```javascript
// Nên thấy log này:
🔔 Notification permission status: default  // hoặc granted/denied
✅ Firebase Messaging initialized
```

### 2. Kiểm Tra User State

```javascript
// Trong console, check xem user đã login chưa:
window.filmflexDebug?.user
// Hoặc
localStorage.getItem('user')
```

### 3. Tìm Notification Button

Button nên xuất hiện ở navbar, bên cạnh search box:

**Desktop:**
- Text: "Enable Notifications" 
- Icon: 🔕 (BellOff)

**Mobile:**
- Text: "Enable"
- Icon: 🔕 (BellOff)

### 4. Check Element trong DOM

```javascript
// Tìm notification button
document.querySelector('[title="Enable push notifications"]')
```

## 🐛 Troubleshooting

### Button Không Hiện

**Nguyên nhân có thể:**

1. **User chưa login**
   ```javascript
   // Check trong console:
   console.log('User:', window.filmflexDebug?.user);
   ```
   ✅ Fix: Login lại

2. **Browser không support Notifications**
   ```javascript
   console.log('Notification' in window);
   ```
   ✅ Fix: Dùng browser khác (Chrome, Firefox, Edge)

3. **Component chưa render**
   ```javascript
   // Check component có mount không
   document.querySelector('.gap-2.flex-shrink-0');
   ```

### Button Bị Ẩn Trên Mobile

- Button có class `flex-shrink-0` để không bị co lại
- Text "Enable" hiển thị trên mobile
- Icon luôn hiển thị

## ✅ Test Flow

### Bước 1: Login
```
1. Đăng ký/Login
2. Chờ redirect về trang chủ
3. Check console log
```

### Bước 2: Tìm Button
```
1. Nhìn navbar (góc phải)
2. Tìm icon 🔕 hoặc text "Enable Notifications"
3. Button nằm giữa search box và user avatar
```

### Bước 3: Click Enable
```
1. Click button "Enable Notifications"
2. Browser sẽ hiện popup xin permission
3. Click "Allow"
4. Thấy toast "🔔 Notifications Enabled"
```

### Bước 4: Verify
```javascript
// Check permission
console.log(Notification.permission); // "granted"

// Check button state
// Button sẽ đổi thành "Notifications On" và disabled
```

## 🔧 Quick Fixes

### Reset Notification Permission

```javascript
// Không thể reset bằng code
// Phải reset manual trong browser settings:

// Chrome:
// Settings → Privacy → Site Settings → Notifications
// Tìm localhost:5000 → Reset

// Firefox:
// Settings → Privacy → Permissions → Notifications
// Tìm localhost:5000 → Remove
```

### Force Reload Component

```javascript
// Reload page
window.location.reload();

// Hoặc clear cache và reload
localStorage.clear();
window.location.reload();
```

## 📊 Expected Console Logs

```
✅ Firebase Messaging initialized
🔔 Notification permission status: default
GET /api/user 200
🔍 PhimGG Debug: Component Loading: MainLayout
🔍 PhimGG Debug: Component Loaded: MainLayout
```

## 🎯 Vị Trí Button

```
Navbar Layout:
[Logo] [Home] [Movies] [News] [My List] | [Search] [🔕 Enable] [👤 User]
                                                      ↑
                                              Notification Button
```

## 📱 Mobile vs Desktop

### Desktop
```tsx
<Button>
  <BellOff /> Enable Notifications
</Button>
```

### Mobile
```tsx
<Button>
  <BellOff /> Enable
</Button>
```

## ⚡ Nếu Vẫn Không Thấy

1. **Hard refresh:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **Clear cache:** DevTools → Application → Clear storage
3. **Check network:** DevTools → Network → Filter "api/user"
4. **Inspect element:** Right-click navbar → Inspect
5. **Check React DevTools:** Components → Navbar → NotificationPermission

---

**Lưu ý:** Button chỉ hiện khi:
- ✅ User đã login
- ✅ Browser support Notifications
- ✅ Component đã mount

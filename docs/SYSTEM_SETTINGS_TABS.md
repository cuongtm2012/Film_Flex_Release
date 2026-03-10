# System Settings - Tab Navigation Implementation

## Tổng quan

Đã cải tiến giao diện **System Settings** trong Admin Dashboard với:
- ✅ Tab navigation ngang để phân chia cấu hình
- ✅ Tab mới **SSO Configuration** cho Google và Facebook OAuth
- ✅ Backend API đầy đủ để lưu/load settings
- ✅ Real-time state management với React hooks
- ✅ Validation và error handling

---

## Cấu trúc Tab

### 1. General Settings
**Nội dung:**
- Site Title
- Site URL  
- Admin Email
- Support Email
- Site Description
- Site Keywords
- Timezone
- Language
- Currency
- Payment Gateway

**Mục đích:** Cấu hình thông tin cơ bản của website

---

### 2. Branding
**Nội dung:**
- Site Logo (upload)
- Favicon (upload)

**Mục đích:** Quản lý hình ảnh đại diện và branding

---

### 3. Email Settings
**Nội dung:**
- SMTP Server
- SMTP Port
- SMTP Username
- SMTP Password (masked)
- Email From Address
- Email From Name

**Mục đích:** Cấu hình email server cho hệ thống gửi email

---

### 4. Security
**Nội dung:**
- reCAPTCHA Site Key
- reCAPTCHA Secret Key (masked)
- Maintenance Mode (toggle)

**Mục đích:** Bảo mật và quản lý trạng thái bảo trì

---

### 5. Analytics & API Keys
**Nội dung:**
- Google Analytics ID
- Stripe Publishable Key
- Stripe Secret Key (masked)
- PayPal Client ID
- PayPal Secret (masked)

**Mục đích:** Tích hợp analytics và payment gateways

---

### 6. Session & Other
**Nội dung:**
- Site Status (Online/Offline)
- Admin Lockout Duration
- Session Timeout
- Password Requirements

**Mục đích:** Quản lý session và các cài đặt khác

---

### 7. SSO Configuration ⭐ NEW
**Nội dung:**

#### Google OAuth
- Google Client ID (input text)
- Google Client Secret (input password, masked)
- Google Login Enable/Disable (toggle)

#### Facebook OAuth  
- Facebook App ID (input text)
- Facebook App Secret (input password, masked)
- Facebook Login Enable/Disable (toggle)

**Mục đích:** Cấu hình đăng nhập một lần (Single Sign-On) với Google và Facebook

**Hướng dẫn:**
- Google: Lấy credentials từ [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
- Facebook: Lấy credentials từ [Facebook Developers](https://developers.facebook.com) → Your Apps → Settings → Basic

---

## Backend API

### Endpoints

#### 1. GET /api/admin/settings
**Mô tả:** Lấy tất cả system settings

**Response:**
```json
{
  "status": true,
  "data": {
    "siteTitle": "PhimGG Admin",
    "siteUrl": "https://admin.filmflex.com",
    "googleClientId": "xxxxx",
    "googleClientSecret": "********",
    "googleLoginEnabled": true,
    ...
  }
}
```

**Security:** Các trường nhạy cảm (passwords, secrets) được mask trước khi trả về

---

#### 2. PUT /api/admin/settings
**Mô tả:** Cập nhật system settings

**Request Body:**
```json
{
  "siteTitle": "New Title",
  "googleClientId": "new-client-id",
  "googleLoginEnabled": true
}
```

**Response:**
```json
{
  "status": true,
  "message": "System settings updated successfully",
  "data": { ... }
}
```

**Validation:** Sử dụng Zod schema để validate

---

#### 3. GET /api/admin/settings/:key
**Mô tả:** Lấy một setting cụ thể

**Example:** GET /api/admin/settings/googleClientId

**Response:**
```json
{
  "status": true,
  "data": {
    "key": "googleClientId",
    "value": "xxxxx"
  }
}
```

---

## Frontend Implementation

### State Management

```typescript
// State
const [systemSettingsTab, setSystemSettingsTab] = useState("general");
const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
const [isSavingSettings, setIsSavingSettings] = useState(false);

// Fetch settings with TanStack Query
const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
  queryKey: ['/api/admin/settings'],
  queryFn: async () => {
    const response = await fetch('/api/admin/settings');
    const data = await response.json();
    return data.data;
  },
  enabled: isAuthenticated && activeTab === 'system-settings',
});

// Update setting helper
const updateSetting = (key: string, value: any) => {
  setSystemSettings(prev => ({
    ...prev,
    [key]: value
  }));
};
```

### Save Settings

```typescript
const handleSaveSettings = async () => {
  setIsSavingSettings(true);
  try {
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemSettings),
    });
    
    if (!response.ok) throw new Error('Failed to save');
    
    toast({ description: "Settings saved successfully" });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
  } catch (error) {
    toast({ 
      variant: "destructive",
      description: "Failed to save settings"
    });
  } finally {
    setIsSavingSettings(false);
  }
};
```

### Input Binding

```typescript
// Example: Google Client ID
<Input 
  id="google-client-id"
  placeholder="Enter Google OAuth Client ID"
  value={systemSettings.googleClientId || ''}
  onChange={(e) => updateSetting('googleClientId', e.target.value)}
/>

// Example: Toggle
<Switch 
  checked={systemSettings.googleLoginEnabled ?? true}
  onCheckedChange={(checked) => updateSetting('googleLoginEnabled', checked)}
/>
```

---

## Security Features

### 1. Password Masking
Tất cả các trường sensitive được mask:
- `smtpPassword` → `********`
- `recaptchaSecretKey` → `6Lc_aCQUAA...`
- `stripeSecretKey` → `sk_test_XXX...`
- `googleClientSecret` → `********`
- `facebookAppSecret` → `********`

### 2. Input Type Security
Các trường secret sử dụng `type="password"`:
```typescript
<Input 
  type="password"  // Hidden by default
  value={systemSettings.googleClientSecret || ''}
/>
```

### 3. HTTPS Only
Tất cả SSO credentials chỉ hoạt động qua HTTPS trong production

---

## Testing Guide

### 1. Test Tab Navigation
```bash
1. Vào Admin Dashboard → System Settings
2. Click qua từng tab: General, Branding, Email, Security, Analytics, Session, SSO
3. Verify mỗi tab hiển thị đúng nội dung
```

### 2. Test SSO Configuration
```bash
1. Click tab "SSO Configuration"
2. Nhập Google Client ID và Secret
3. Nhập Facebook App ID và Secret
4. Toggle Google/Facebook login switches
5. Click "Save Changes"
6. Reload page → verify data được lưu
```

### 3. Test API Endpoints
```bash
# Get all settings
curl http://localhost:5000/api/admin/settings

# Update settings
curl -X PUT http://localhost:5000/api/admin/settings \
  -H "Content-Type: application/json" \
  -d '{"googleClientId": "test-id"}'

# Get specific setting
curl http://localhost:5000/api/admin/settings/googleClientId
```

### 4. Test Validation
```bash
1. Nhập invalid email vào Admin Email
2. Click Save → should show validation error
3. Nhập invalid URL vào Site URL
4. Click Save → should show validation error
```

---

## Files Modified

### Frontend
- ✅ `client/src/pages/AdminPage.tsx`
  - Added system settings tabs
  - Added SSO configuration UI
  - Added state management
  - Added save/load handlers

### Backend
- ✅ `server/routes/admin/settings.ts` (NEW)
  - GET /api/admin/settings
  - PUT /api/admin/settings
  - GET /api/admin/settings/:key
  
- ✅ `server/routes/admin/index.ts`
  - Registered settings router

---

## Environment Variables

Add to `.env` for production:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

---

## Future Enhancements

### 1. Database Storage
Hiện tại settings lưu trong memory. Cần migrate sang database:
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  encrypted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Encryption
Encrypt sensitive fields trước khi lưu vào DB:
```typescript
import crypto from 'crypto';

const encrypt = (text: string) => {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
};
```

### 3. Audit Logging
Log mỗi lần thay đổi settings:
```typescript
await db.auditLog.create({
  user_id: req.user.id,
  action: 'UPDATE_SETTINGS',
  details: `Changed ${key} from ${oldValue} to ${newValue}`,
  timestamp: new Date()
});
```

### 4. Role-Based Access
Chỉ admin mới được thay đổi SSO settings:
```typescript
if (req.body.googleClientId && req.user.role !== 'admin') {
  return res.status(403).json({
    status: false,
    message: 'Only admins can update SSO settings'
  });
}
```

---

## Support

Nếu gặp vấn đề, kiểm tra:
1. ✅ Server đang chạy: `npm run dev`
2. ✅ User đã login với role "admin"
3. ✅ Console không có lỗi
4. ✅ Network tab shows 200 OK for API calls

---

**Last Updated:** November 9, 2025  
**Version:** 1.0.0  
**Status:** ✅ Completed

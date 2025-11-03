# 🔐 OAuth Setup Guide for PhimGG

## Current Issue: Error 401 - invalid_client

The **Error 401: invalid_client** you're seeing indicates that your Google/Facebook OAuth credentials are either missing or incorrectly configured.

## ✅ **Quick Fix Steps:**

### 1. **Google OAuth Setup**

#### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Create a new project or select existing one
3. Enable the **Google+ API** or **Google Identity API**

#### Step 2: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Set **Name**: `PhimGG OAuth`

#### Step 3: Configure Redirect URIs
Add these **Authorized redirect URIs**:
```
http://localhost:5000/api/auth/google/callback
https://phimgg.com/api/auth/google/callback
```

#### Step 4: Copy Your Credentials
- Copy the **Client ID** (looks like: `1234567890-abcdef.apps.googleusercontent.com`)
- Copy the **Client Secret** (looks like: `GOCSPX-abcdef123456`)

### 2. **Facebook OAuth Setup**

#### Step 1: Go to Facebook Developers
1. Visit: https://developers.facebook.com/
2. Create a new app or select existing one
3. Add **Facebook Login** product

#### Step 2: Configure Facebook Login
1. Go to **Facebook Login** → **Settings**
2. Add these **Valid OAuth Redirect URIs**:
```
http://localhost:5000/api/auth/facebook/callback
https://phimgg.com/api/auth/facebook/callback
```

#### Step 3: Copy Your Credentials
- Copy the **App ID** from App Settings
- Copy the **App Secret** from App Settings

### 3. **Update Your .env File**

Open `/Users/jack/Desktop/1.PROJECT/Film_Flex_Release/.env` and replace the placeholder values:

```env
# Replace these placeholder values with your actual credentials:

GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-google-secret-here

FACEBOOK_APP_ID=1234567890123456
FACEBOOK_APP_SECRET=your-actual-facebook-app-secret-here
```

### 4. **Test Your Setup**

1. Restart your server: `npm run dev`
2. Go to: http://localhost:5000/auth
3. Click the Google or Facebook buttons
4. You should now be redirected to the OAuth providers instead of getting errors

## 🔧 **Fallback Logic (Already Implemented)**

Your app now has smart fallback logic:
- ✅ **Missing credentials detection**: Shows helpful error messages
- ✅ **Graceful degradation**: OAuth buttons show error toasts instead of breaking
- ✅ **User guidance**: Clear instructions on what to do when OAuth is unavailable

## 🚨 **Common Issues & Solutions:**

### Issue 1: "OAuth client was not found"
**Solution**: Double-check your Client ID in the `.env` file

### Issue 2: "Redirect URI mismatch"
**Solution**: Ensure redirect URIs in OAuth console match exactly:
- Development: `http://localhost:5000/api/auth/google/callback`
- Production: `https://phimgg.com/api/auth/facebook/callback`

### Issue 3: Facebook "App Not Setup: This app is still in development mode"
**Solution**: Switch your Facebook app to "Live" mode in the App Dashboard

### Issue 4: Still getting errors after setup
**Solution**: 
1. Clear browser cache
2. Restart your server
3. Check server console for helpful OAuth warning messages

## 📝 **Verification Checklist:**

- [ ] Google Cloud project created
- [ ] Google OAuth 2.0 credentials created
- [ ] Google redirect URIs configured correctly
- [ ] Facebook app created
- [ ] Facebook Login product added
- [ ] Facebook redirect URIs configured correctly
- [ ] `.env` file updated with real credentials
- [ ] Server restarted
- [ ] OAuth buttons tested

## 🎯 **Expected Behavior After Setup:**

1. **With credentials**: OAuth buttons redirect to Google/Facebook login
2. **Without credentials**: OAuth buttons show friendly error messages
3. **Registration/Login**: Still works with email/password as fallback

Your OAuth integration is now ready! The app will gracefully handle both configured and unconfigured OAuth scenarios.
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Schema for system settings
const systemSettingsSchema = z.object({
  // General Settings
  siteTitle: z.string().optional(),
  siteUrl: z.string().url().optional(),
  adminEmail: z.string().email().optional(),
  supportEmail: z.string().email().optional(),
  siteDescription: z.string().optional(),
  siteKeywords: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  currency: z.string().optional(),
  paymentGateway: z.string().optional(),
  
  // Email Settings
  smtpServer: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
  emailFromAddress: z.string().email().optional(),
  emailFromName: z.string().optional(),
  
  // Security
  recaptchaSiteKey: z.string().optional(),
  recaptchaSecretKey: z.string().optional(),
  maintenanceMode: z.boolean().optional(),
  
  // Analytics & API Keys
  googleAnalyticsId: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  paypalClientId: z.string().optional(),
  paypalSecret: z.string().optional(),
  
  // Session & Other
  siteStatus: z.string().optional(),
  adminLockoutDuration: z.string().optional(),
  sessionTimeout: z.string().optional(),
  passwordRequirements: z.string().optional(),
  
  // SSO Configuration
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  facebookAppId: z.string().optional(),
  facebookAppSecret: z.string().optional(),
  googleLoginEnabled: z.boolean().optional(),
  facebookLoginEnabled: z.boolean().optional(),
});

// In-memory storage for demo (replace with database in production)
let systemSettings: Record<string, any> = {
  siteTitle: 'PhimGG Admin',
  siteUrl: 'https://admin.filmflex.com',
  adminEmail: 'admin@filmflex.com',
  supportEmail: 'support@filmflex.com',
  siteDescription: 'A premier platform for watching and sharing films and TV shows.',
  siteKeywords: 'films, movies, tv shows, streaming',
  timezone: 'UTC',
  language: 'en',
  currency: 'USD',
  paymentGateway: 'stripe',
  smtpServer: 'smtp.filmflex.com',
  smtpPort: '587',
  smtpUsername: 'admin@filmflex.com',
  smtpPassword: '********',
  emailFromAddress: 'no-reply@filmflex.com',
  emailFromName: 'PhimGG Support',
  recaptchaSiteKey: '6Lc_aCQUAAAAA...',
  recaptchaSecretKey: '6Lc_aCQUAAAAA...',
  maintenanceMode: false,
  googleAnalyticsId: 'UA-XXXXXXXXX-X',
  stripePublishableKey: 'pk_test_XXXXXXXXXXXXXXXX',
  stripeSecretKey: 'sk_test_XXXXXXXXXXXXXXXX',
  paypalClientId: 'AXXXXXXXXXXXXXXXXXX',
  paypalSecret: 'XXXXXXXXXXXXXXXXX',
  siteStatus: 'online',
  adminLockoutDuration: '15',
  sessionTimeout: '30',
  passwordRequirements: 'Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  facebookAppId: process.env.FACEBOOK_APP_ID || '',
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET || '',
  googleLoginEnabled: true,
  facebookLoginEnabled: true,
};

// GET /api/admin/settings - Get all system settings
router.get('/', async (req, res) => {
  try {
    // Remove sensitive data before sending
    const safeSettings = { ...systemSettings };
    
    // Mask sensitive fields
    if (safeSettings.smtpPassword) {
      safeSettings.smtpPassword = '********';
    }
    if (safeSettings.recaptchaSecretKey) {
      safeSettings.recaptchaSecretKey = safeSettings.recaptchaSecretKey.substring(0, 10) + '...';
    }
    if (safeSettings.stripeSecretKey) {
      safeSettings.stripeSecretKey = safeSettings.stripeSecretKey.substring(0, 10) + '...';
    }
    if (safeSettings.paypalSecret) {
      safeSettings.paypalSecret = safeSettings.paypalSecret.substring(0, 10) + '...';
    }
    if (safeSettings.googleClientSecret) {
      safeSettings.googleClientSecret = '********';
    }
    if (safeSettings.facebookAppSecret) {
      safeSettings.facebookAppSecret = '********';
    }
    
    res.json({
      status: true,
      data: safeSettings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch system settings'
    });
  }
});

// PUT /api/admin/settings - Update system settings
router.put('/', async (req, res) => {
  try {
    const validatedData = systemSettingsSchema.parse(req.body);
    
    // Update settings (merge with existing)
    systemSettings = {
      ...systemSettings,
      ...validatedData
    };
    
    // If SSO credentials are updated, you might want to update environment variables
    // or save to a secure configuration store
    if (validatedData.googleClientId || validatedData.googleClientSecret) {
      console.log('Google SSO credentials updated');
      // TODO: Update .env file or secure config store
    }
    
    if (validatedData.facebookAppId || validatedData.facebookAppSecret) {
      console.log('Facebook SSO credentials updated');
      // TODO: Update .env file or secure config store
    }
    
    res.json({
      status: true,
      message: 'System settings updated successfully',
      data: systemSettings
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: false,
        message: 'Invalid settings data',
        errors: error.errors
      });
    } else {
      res.status(500).json({
        status: false,
        message: 'Failed to update system settings'
      });
    }
  }
});

// GET /api/admin/settings/:key - Get specific setting
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!systemSettings.hasOwnProperty(key)) {
      return res.status(404).json({
        status: false,
        message: 'Setting not found'
      });
    }
    
    let value = systemSettings[key];
    
    // Mask sensitive fields
    const sensitiveFields = ['smtpPassword', 'recaptchaSecretKey', 'stripeSecretKey', 
                            'paypalSecret', 'googleClientSecret', 'facebookAppSecret'];
    
    if (sensitiveFields.includes(key) && value) {
      value = '********';
    }
    
    res.json({
      status: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch setting'
    });
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../../storage.js';

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

  // Security - accept both string and boolean
  recaptchaSiteKey: z.string().optional(),
  recaptchaSecretKey: z.string().optional(),
  maintenanceMode: z.union([z.boolean(), z.string()]).optional(),

  // Analytics & API Keys
  googleAnalyticsId: z.string().optional(),
  stripePublishableKey: z.string().optional(),
  stripeSecretKey: z.string().optional(),
  paypalClientId: z.string().optional(),
  paypalSecret: z.string().optional(),
  deepseekApiKey: z.string().optional(),

  // Session & Other
  siteStatus: z.string().optional(),
  adminLockoutDuration: z.string().optional(),
  sessionTimeout: z.string().optional(),
  passwordRequirements: z.string().optional(),

  // SSO Configuration - accept both string and boolean
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  facebookAppId: z.string().optional(),
  facebookAppSecret: z.string().optional(),
  googleLoginEnabled: z.union([z.boolean(), z.string()]).optional(),
  facebookLoginEnabled: z.union([z.boolean(), z.string()]).optional(),
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
    // Load all settings from database
    const dbSettings = await storage.getAllSettings();

    // Map database keys back to frontend keys (snake_case to camelCase for SSO)
    const frontendSettings: Record<string, any> = { ...systemSettings }; // Start with defaults

    // Override with database values
    for (const [key, value] of Object.entries(dbSettings)) {
      if (key === 'google_client_id') {
        frontendSettings.googleClientId = value;
      } else if (key === 'google_client_secret') {
        frontendSettings.googleClientSecret = value ? '********' : '';
      } else if (key === 'google_oauth_enabled') {
        frontendSettings.googleLoginEnabled = value === 'true' || value === true;
      } else if (key === 'facebook_app_id') {
        frontendSettings.facebookAppId = value;
      } else if (key === 'facebook_app_secret') {
        frontendSettings.facebookAppSecret = value ? '********' : '';
      } else if (key === 'facebook_oauth_enabled') {
        frontendSettings.facebookLoginEnabled = value === 'true' || value === true;
      } else if (key === 'deepseek_api_key') {
        frontendSettings.deepseekApiKey = value ? '********' : '';
      } else {
        frontendSettings[key] = value;
      }
    }

    // Mask other sensitive fields
    if (frontendSettings.smtpPassword) {
      frontendSettings.smtpPassword = '********';
    }
    if (frontendSettings.recaptchaSecretKey) {
      frontendSettings.recaptchaSecretKey = frontendSettings.recaptchaSecretKey.substring(0, 10) + '...';
    }
    if (frontendSettings.stripeSecretKey) {
      frontendSettings.stripeSecretKey = frontendSettings.stripeSecretKey.substring(0, 10) + '...';
    }
    if (frontendSettings.paypalSecret) {
      frontendSettings.paypalSecret = frontendSettings.paypalSecret.substring(0, 10) + '...';
    }
    if (frontendSettings.deepseekApiKey) {
      frontendSettings.deepseekApiKey = '********';
    }

    res.json({
      status: true,
      data: frontendSettings
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

    // Get user ID from session
    const userId = (req.user as any)?.id || 1;

    // Map frontend keys to database keys (camelCase to snake_case for SSO)
    const dbSettings: Record<string, any> = {};

    for (const [key, value] of Object.entries(validatedData)) {
      if (value === undefined || value === null) continue;

      // Convert camelCase to snake_case for SSO keys
      if (key === 'googleClientId') {
        dbSettings['google_client_id'] = value;
      } else if (key === 'googleClientSecret') {
        dbSettings['google_client_secret'] = value;
      } else if (key === 'googleLoginEnabled') {
        dbSettings['google_oauth_enabled'] = value ? 'true' : 'false';
      } else if (key === 'facebookAppId') {
        dbSettings['facebook_app_id'] = value;
      } else if (key === 'facebookAppSecret') {
        dbSettings['facebook_app_secret'] = value;
      } else if (key === 'facebookLoginEnabled') {
        dbSettings['facebook_oauth_enabled'] = value ? 'true' : 'false';
      } else if (key === 'deepseekApiKey') {
        dbSettings['deepseek_api_key'] = value;
      } else {
        dbSettings[key] = value;
      }
    }

    // Save to database
    await storage.updateSettings(dbSettings, userId);

    // Log SSO updates
    if (dbSettings.google_client_id || dbSettings.google_client_secret) {
      console.log('Google SSO credentials updated');
    }

    if (dbSettings.facebook_app_id || dbSettings.facebook_app_secret) {
      console.log('Facebook SSO credentials updated');
    }

    res.json({
      status: true,
      message: 'System settings updated successfully'
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
      'paypalSecret', 'googleClientSecret', 'facebookAppSecret', 'deepseekApiKey'];

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

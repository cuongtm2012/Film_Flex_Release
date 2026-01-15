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
  deepseek_api_key: z.string().optional(), // Support snake_case from frontend
  resend_api_key: z.string().optional(), // Support snake_case from frontend

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

// GET /api/admin/settings - Get all system settings
router.get('/', async (req, res) => {
  try {
    // Load all settings from database ONLY - no cache
    const dbSettings = await storage.getAllSettings();

    // Map database keys to frontend keys (snake_case to camelCase for SSO)
    const frontendSettings: Record<string, any> = {};

    // Process database values
    for (const [key, value] of Object.entries(dbSettings)) {
      if (key === 'google_client_id') {
        frontendSettings.googleClientId = value || '';
      } else if (key === 'google_client_secret') {
        frontendSettings.googleClientSecret = value ? '********' : '';
      } else if (key === 'google_oauth_enabled') {
        frontendSettings.googleLoginEnabled = value === 'true' || value === true;
      } else if (key === 'facebook_app_id') {
        frontendSettings.facebookAppId = value || '';
      } else if (key === 'facebook_app_secret') {
        frontendSettings.facebookAppSecret = value ? '********' : '';
      } else if (key === 'facebook_oauth_enabled') {
        frontendSettings.facebookLoginEnabled = value === 'true' || value === true;
      } else if (key === 'deepseek_api_key') {
        frontendSettings.deepseekApiKey = value ? '********' : '';
        frontendSettings.deepseek_api_key = value ? '********' : '';
      } else if (key === 'resend_api_key') {
        frontendSettings.resendApiKey = value ? '********' : '';
        frontendSettings.resend_api_key = value ? '********' : '';
      } else {
        // For all other settings, use value from DB or empty string
        frontendSettings[key] = value || '';
      }
    }

    // Mask other sensitive fields if they exist
    if (frontendSettings.smtpPassword && frontendSettings.smtpPassword !== '') {
      frontendSettings.smtpPassword = '********';
    }
    if (frontendSettings.recaptchaSecretKey && frontendSettings.recaptchaSecretKey !== '') {
      frontendSettings.recaptchaSecretKey = frontendSettings.recaptchaSecretKey.substring(0, 10) + '...';
    }
    if (frontendSettings.stripeSecretKey && frontendSettings.stripeSecretKey !== '') {
      frontendSettings.stripeSecretKey = frontendSettings.stripeSecretKey.substring(0, 10) + '...';
    }
    if (frontendSettings.paypalSecret && frontendSettings.paypalSecret !== '') {
      frontendSettings.paypalSecret = frontendSettings.paypalSecret.substring(0, 10) + '...';
    }
    if (frontendSettings.deepseekApiKey && frontendSettings.deepseekApiKey !== '') {
      frontendSettings.deepseekApiKey = '********';
    }
    if (frontendSettings.deepseek_api_key && frontendSettings.deepseek_api_key !== '') {
      frontendSettings.deepseek_api_key = '********';
    }
    if (frontendSettings.resendApiKey && frontendSettings.resendApiKey !== '') {
      frontendSettings.resendApiKey = '********';
    }
    if (frontendSettings.resend_api_key && frontendSettings.resend_api_key !== '') {
      frontendSettings.resend_api_key = '********';
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

      // Skip masked values - don't update if value is the masked placeholder
      if (typeof value === 'string' && value === '********') {
        console.log(`Skipping masked value for key: ${key}`);
        continue;
      }

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
      } else if (key === 'deepseekApiKey' || key === 'deepseek_api_key') {
        // Support both camelCase and snake_case
        dbSettings['deepseek_api_key'] = value;
      } else if (key === 'resendApiKey' || key === 'resend_api_key') {
        // Support both camelCase and snake_case
        dbSettings['resend_api_key'] = value;
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

    // Load setting from database
    const setting = await storage.getSetting(key);

    if (!setting) {
      return res.status(404).json({
        status: false,
        message: 'Setting not found'
      });
    }

    let value = setting.value;

    // Mask sensitive fields
    const sensitiveFields = ['smtpPassword', 'recaptchaSecretKey', 'stripeSecretKey',
      'paypalSecret', 'googleClientSecret', 'facebookAppSecret', 'deepseekApiKey',
      'google_client_secret', 'facebook_app_secret', 'deepseek_api_key', 'resend_api_key'];

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

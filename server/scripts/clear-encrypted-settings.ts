import { storage } from '../storage.js';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';

/**
 * Clear encrypted settings that were encrypted with old key
 * This allows fresh configuration through Admin Dashboard
 */
async function clearEncryptedSettings() {
    try {
        console.log('🔧 Clearing encrypted settings from database...');

        // List of encrypted keys to clear
        const encryptedKeys = [
            'google_client_secret',
            'facebook_app_secret',
            'deepseek_api_key',
            'resend_api_key',
            'sendgrid_api_key'
        ];

        for (const key of encryptedKeys) {
            await db.execute(sql`
                DELETE FROM system_settings 
                WHERE key = ${key} AND encrypted = true
            `);
            console.log(`✅ Cleared: ${key}`);
        }

        console.log('\n✅ All encrypted settings cleared successfully!');
        console.log('📝 Please configure API keys through Admin Dashboard:');
        console.log('   → System Settings → Analytics & API Keys');
        console.log('   → System Settings → SSO Configuration\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing settings:', error);
        process.exit(1);
    }
}

clearEncryptedSettings();

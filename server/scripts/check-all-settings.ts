import { db } from '../db.js';
import { sql } from 'drizzle-orm';

/**
 * Check all API key settings in database
 */
async function checkAllSettings() {
    try {
        console.log('🔍 Checking ALL API key settings in database...\n');

        // Query all settings related to API keys
        const result = await db.execute(sql`
            SELECT key, value, encrypted, category, updated_at 
            FROM system_settings 
            WHERE key IN (
                'deepseek_api_key',
                'resend_api_key',
                'sendgrid_api_key',
                'google_client_id',
                'google_client_secret',
                'facebook_app_id',
                'facebook_app_secret',
                'google_oauth_enabled',
                'facebook_oauth_enabled'
            )
            ORDER BY category, key
        `);

        if (!result.rows || result.rows.length === 0) {
            console.log('⚠️  No API key settings found in database\n');
        } else {
            console.log(`Found ${result.rows.length} setting(s):\n`);

            for (const row of result.rows) {
                const key = row.key as string;
                const value = row.value as string;
                const encrypted = row.encrypted as boolean;
                const category = row.category as string;

                console.log(`📌 ${key}`);
                console.log(`   Category: ${category}`);
                console.log(`   Encrypted: ${encrypted ? '✅ Yes' : '❌ No'}`);
                console.log(`   Has Value: ${value ? '✅ Yes' : '❌ No'}`);
                console.log('');
            }
        }

        // Check what keys are missing
        const expectedKeys = [
            'deepseek_api_key',
            'resend_api_key',
            'google_client_secret',
            'facebook_app_secret'
        ];

        const foundKeys = result.rows?.map(row => row.key as string) || [];
        const missingKeys = expectedKeys.filter(key => !foundKeys.includes(key));

        if (missingKeys.length > 0) {
            console.log('⚠️  Missing encrypted keys:');
            missingKeys.forEach(key => console.log(`   - ${key}`));
            console.log('');
        }

        console.log('✅ Check complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking settings:', error);
        process.exit(1);
    }
}

checkAllSettings();

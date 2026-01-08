import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { decrypt } from '../services/encryption.js';

/**
 * Verify encrypted API keys in database
 */
async function verifyEncryptedKeys() {
    try {
        console.log('🔍 Checking encrypted API keys in database...\n');

        // Query encrypted settings
        const result = await db.execute(sql`
            SELECT key, value, encrypted, category, updated_at 
            FROM system_settings 
            WHERE encrypted = true
            ORDER BY key
        `);

        if (!result.rows || result.rows.length === 0) {
            console.log('⚠️  No encrypted settings found in database');
            process.exit(0);
        }

        console.log(`Found ${result.rows.length} encrypted setting(s):\n`);

        for (const row of result.rows) {
            const key = row.key as string;
            const value = row.value as string;
            const encrypted = row.encrypted as boolean;
            const category = row.category as string;
            const updatedAt = row.updated_at as Date;

            console.log(`📌 Key: ${key}`);
            console.log(`   Category: ${category}`);
            console.log(`   Encrypted: ${encrypted ? '✅ Yes' : '❌ No'}`);
            console.log(`   Updated: ${updatedAt}`);

            // Try to decrypt
            try {
                const decrypted = decrypt(value);
                const maskedValue = decrypted.substring(0, 8) + '...' + decrypted.substring(decrypted.length - 4);
                console.log(`   Value: ${maskedValue} (decryption ✅ successful)`);
            } catch (error) {
                console.log(`   Value: ❌ DECRYPTION FAILED`);
                console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
            }

            console.log('');
        }

        console.log('✅ Verification complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error verifying keys:', error);
        process.exit(1);
    }
}

verifyEncryptedKeys();

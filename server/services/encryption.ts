import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Encryption service for sensitive data using AES-256-GCM
 * Requires ENCRYPTION_KEY environment variable (32 bytes hex string)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;

    if (!envKey) {
        console.warn('⚠️  ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION)');
        // Use session secret as fallback (not ideal but better than nothing)
        const fallbackSecret = process.env.SESSION_SECRET || 'filmflex-default-encryption-key';
        return scryptSync(fallbackSecret, 'salt', KEY_LENGTH);
    }

    // If hex string, convert to buffer
    if (envKey.length === 64) {
        return Buffer.from(envKey, 'hex');
    }

    // Otherwise derive key from string
    return scryptSync(envKey, 'salt', KEY_LENGTH);
}

/**
 * Encrypt a string value
 * Returns: base64 encoded string with format: iv:encrypted:authTag:salt
 */
export function encrypt(text: string): string {
    if (!text) return '';

    try {
        const iv = randomBytes(IV_LENGTH);
        const salt = randomBytes(SALT_LENGTH);
        const key = getEncryptionKey();

        const cipher = createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Combine iv, encrypted data, auth tag, and salt
        const combined = `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}:${salt.toString('hex')}`;

        return Buffer.from(combined).toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt an encrypted string
 * Expects format: base64(iv:encrypted:authTag:salt)
 */
export function decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
        // Decode base64
        const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
        const parts = combined.split(':');

        if (parts.length !== 4) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, encrypted, authTagHex] = parts;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const key = getEncryptionKey();

        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Test encryption/decryption
 */
export function testEncryption(): boolean {
    try {
        const testData = 'test-secret-key-12345';
        const encrypted = encrypt(testData);
        const decrypted = decrypt(encrypted);

        return testData === decrypted;
    } catch (error) {
        console.error('Encryption test failed:', error);
        return false;
    }
}

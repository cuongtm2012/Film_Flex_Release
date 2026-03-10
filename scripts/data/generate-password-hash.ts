import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a random salt
 * @param password The password to hash
 * @returns A string in the format "{hash}.{salt}"
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Main function to generate a password hash
 */
async function generatePasswordHash() {
  // Get password from command line argument
  const password = process.argv[2];
  
  if (!password) {
    console.error('Please provide a password as a command-line argument.');
    console.error('Usage: npm run generate-password-hash -- YourPassword123');
    process.exit(1);
  }
  
  try {
    const hashedPassword = await hashPassword(password);
    
    console.log('\n='.repeat(30));
    console.log('Password Hash Generator');
    console.log('='.repeat(30));
    console.log(`Password: ${password}`);
    console.log(`Hashed: ${hashedPassword}`);
    console.log('='.repeat(30));
    console.log('\nUse this hash in your database seeds or for updating passwords.');
    
  } catch (error) {
    console.error('Error generating password hash:', error);
    process.exit(1);
  }
}

// Run the generator
generatePasswordHash(); 
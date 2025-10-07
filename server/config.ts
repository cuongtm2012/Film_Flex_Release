import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Load environment-specific file first, then fallback to .env
if (nodeEnv === 'development') {
  dotenv.config({ path: resolve(__dirname, '../.env.development') });
}
dotenv.config({ path: resolve(__dirname, '../.env') });

console.log(`🔧 Loading environment: ${nodeEnv}`);
console.log(`📁 Config file: .env${nodeEnv === 'development' ? '.development' : ''}`);

interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string | undefined;
  sessionSecret: string | undefined;
  clientUrl: string;
  googleClientId: string | undefined;
  googleClientSecret: string | undefined;
  facebookAppId: string | undefined;
  facebookAppSecret: string | undefined;
  // Cloudflare Worker configuration
  useCloudflareOAuth: boolean;
  cloudflareWorkerUrl: string;
  // Email service configuration
  useCloudflareEmail: boolean;
  sendgridApiKey: string | undefined;
  fromEmail: string;
  fromName: string;
}

export const config: Config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  facebookAppId: process.env.FACEBOOK_APP_ID,
  facebookAppSecret: process.env.FACEBOOK_APP_SECRET,
  // Cloudflare Worker settings
  useCloudflareOAuth: process.env.USE_CLOUDFLARE_OAUTH === 'true' || nodeEnv === 'production',
  cloudflareWorkerUrl: process.env.CLOUDFLARE_WORKER_URL || 'https://phimgg.com',
  // Email service settings
  useCloudflareEmail: process.env.USE_CLOUDFLARE_EMAIL === 'true' || nodeEnv === 'production',
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  fromEmail: process.env.FROM_EMAIL || 'noreply@filmflex.com',
  fromName: process.env.FROM_NAME || 'PhimGG'
};

// Debug OAuth and Email configuration in development
if (nodeEnv === 'development') {
  if (config.useCloudflareOAuth) {
    console.log(`☁️  OAuth handled by Cloudflare Worker at: ${config.cloudflareWorkerUrl}`);
    console.log(`🔑 Google OAuth: ✅ Configured in Cloudflare Secrets`);
    console.log(`🔑 Facebook OAuth: ✅ Configured in Cloudflare Secrets`);
  } else {
    console.log(`🔑 Google OAuth: ${config.googleClientId ? '✅ Configured locally' : '❌ Missing local credentials'}`);
    console.log(`🔑 Facebook OAuth: ${config.facebookAppId ? '✅ Configured locally' : '❌ Missing local credentials'}`);
    console.log(`💡 Tip: Set USE_CLOUDFLARE_OAUTH=true to use Cloudflare Worker OAuth instead`);
  }
  
  if (config.useCloudflareEmail) {
    console.log(`📧 Email Service: ✅ Configured in Cloudflare Secrets`);
  } else {
    console.log(`📧 Email Service: ${config.sendgridApiKey ? '✅ Configured locally' : '❌ Missing SendGrid API key'}`);
    console.log(`💡 Tip: Set USE_CLOUDFLARE_EMAIL=true to use Cloudflare Worker Email instead`);
  }
}
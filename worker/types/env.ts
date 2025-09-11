// Environment variables interface for type safety
export interface Env {
  // OAuth Secrets (stored in Cloudflare Secrets)
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  
  // Email Service Secrets
  SENDGRID_API_KEY: string;
  
  // Regular environment variables
  NODE_ENV: string;
  CLIENT_URL: string;
  
  // KV namespace for sessions (optional)
  SESSIONS?: KVNamespace;
}

// OAuth provider configuration
export interface OAuthProvider {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

// User profile from OAuth providers
export interface OAuthProfile {
  id: string;
  email?: string;
  name?: string;
  displayName?: string;
  avatar?: string;
  provider: 'google' | 'facebook';
}

// OAuth token response
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}
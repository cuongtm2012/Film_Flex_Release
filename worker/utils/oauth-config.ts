import { Env, OAuthProvider } from '../types/env';

export class OAuthConfig {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  getGoogleConfig(): OAuthProvider {
    return {
      clientId: this.env.GOOGLE_CLIENT_ID,
      clientSecret: this.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${this.env.CLIENT_URL}/api/auth/google/callback`,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['profile', 'email']
    };
  }

  getFacebookConfig(): OAuthProvider {
    return {
      clientId: this.env.FACEBOOK_APP_ID,
      clientSecret: this.env.FACEBOOK_APP_SECRET,
      redirectUri: `${this.env.CLIENT_URL}/api/auth/facebook/callback`,
      authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      userInfoUrl: 'https://graph.facebook.com/v18.0/me',
      scopes: ['public_profile'] // Email scope removed as it's deprecated
    };
  }

  generateState(): string {
    // Generate cryptographically secure random state for CSRF protection
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  buildAuthUrl(provider: OAuthProvider, state: string): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state: state,
    });

    return `${provider.authUrl}?${params.toString()}`;
  }
}
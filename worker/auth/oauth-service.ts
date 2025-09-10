import { Env, OAuthProvider, OAuthTokenResponse, OAuthProfile } from '../types/env';

export class OAuthService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: provider.redirectUri,
    });

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    return response.json() as Promise<OAuthTokenResponse>;
  }

  async getUserProfile(provider: OAuthProvider, accessToken: string, providerName: 'google' | 'facebook'): Promise<OAuthProfile> {
    let url = provider.userInfoUrl;
    
    // Add Facebook-specific fields
    if (providerName === 'facebook') {
      url += '?fields=id,name,picture';
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    const data = await response.json();

    // Normalize profile data based on provider
    if (providerName === 'google') {
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        displayName: data.name,
        avatar: data.picture,
        provider: 'google'
      };
    } else {
      // Facebook
      return {
        id: data.id,
        email: undefined, // Facebook doesn't provide email anymore
        name: data.name,
        displayName: data.name,
        avatar: data.picture?.data?.url,
        provider: 'facebook'
      };
    }
  }

  generateJWT(profile: OAuthProfile): Promise<string> {
    // Simple JWT implementation for demo - in production use a proper JWT library
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: profile.id,
      name: profile.displayName,
      email: profile.email,
      avatar: profile.avatar,
      provider: profile.provider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));

    return this.signJWT(`${header}.${payload}`);
  }

  private async signJWT(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.env.SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    return `${data}.${signatureBase64}`;
  }
}
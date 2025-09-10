import { Env } from './types/env';
import { OAuthConfig } from './utils/oauth-config';
import { OAuthService } from './auth/oauth-service';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CLIENT_URL,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const oauthConfig = new OAuthConfig(env);
    const oauthService = new OAuthService(env);

    try {
      // Route handling
      switch (path) {
        case '/api/auth/google':
          return handleGoogleAuth(oauthConfig, corsHeaders);

        case '/api/auth/google/callback':
          return handleGoogleCallback(request, oauthConfig, oauthService, env, corsHeaders);

        case '/api/auth/facebook':
          return handleFacebookAuth(oauthConfig, corsHeaders);

        case '/api/auth/facebook/callback':
          return handleFacebookCallback(request, oauthConfig, oauthService, env, corsHeaders);

        case '/api/auth/logout':
          return handleLogout(corsHeaders);

        default:
          return new Response('Not Found', { 
            status: 404, 
            headers: corsHeaders 
          });
      }
    } catch (error) {
      console.error('OAuth Error:', error);
      return new Response('Internal Server Error', { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },
};

// Google OAuth handlers
async function handleGoogleAuth(oauthConfig: OAuthConfig, corsHeaders: HeadersInit): Promise<Response> {
  const googleProvider = oauthConfig.getGoogleConfig();
  const state = oauthConfig.generateState();
  const authUrl = oauthConfig.buildAuthUrl(googleProvider, state);

  // In production, you might want to store the state in KV for validation
  // For simplicity, we're redirecting directly

  return Response.redirect(authUrl, 302);
}

async function handleGoogleCallback(
  request: Request,
  oauthConfig: OAuthConfig,
  oauthService: OAuthService,
  env: Env,
  corsHeaders: HeadersInit
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return Response.redirect(`${env.CLIENT_URL}/auth?error=google_auth_failed`, 302);
  }

  if (!code) {
    return Response.redirect(`${env.CLIENT_URL}/auth?error=missing_code`, 302);
  }

  try {
    const googleProvider = oauthConfig.getGoogleConfig();
    
    // Exchange code for token
    const tokenResponse = await oauthService.exchangeCodeForToken(googleProvider, code);
    
    // Get user profile
    const profile = await oauthService.getUserProfile(googleProvider, tokenResponse.access_token, 'google');
    
    // Generate JWT token
    const jwtToken = await oauthService.generateJWT(profile);
    
    // Set secure cookie and redirect
    const response = Response.redirect(`${env.CLIENT_URL}/`, 302);
    response.headers.set('Set-Cookie', `auth_token=${jwtToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`);
    
    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    return Response.redirect(`${env.CLIENT_URL}/auth?error=google_callback_failed`, 302);
  }
}

// Facebook OAuth handlers
async function handleFacebookAuth(oauthConfig: OAuthConfig, corsHeaders: HeadersInit): Promise<Response> {
  const facebookProvider = oauthConfig.getFacebookConfig();
  const state = oauthConfig.generateState();
  const authUrl = oauthConfig.buildAuthUrl(facebookProvider, state);

  return Response.redirect(authUrl, 302);
}

async function handleFacebookCallback(
  request: Request,
  oauthConfig: OAuthConfig,
  oauthService: OAuthService,
  env: Env,
  corsHeaders: HeadersInit
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return Response.redirect(`${env.CLIENT_URL}/auth?error=facebook_auth_failed`, 302);
  }

  if (!code) {
    return Response.redirect(`${env.CLIENT_URL}/auth?error=missing_code`, 302);
  }

  try {
    const facebookProvider = oauthConfig.getFacebookConfig();
    
    // Exchange code for token
    const tokenResponse = await oauthService.exchangeCodeForToken(facebookProvider, code);
    
    // Get user profile
    const profile = await oauthService.getUserProfile(facebookProvider, tokenResponse.access_token, 'facebook');
    
    // Generate JWT token
    const jwtToken = await oauthService.generateJWT(profile);
    
    // Set secure cookie and redirect
    const response = Response.redirect(`${env.CLIENT_URL}/`, 302);
    response.headers.set('Set-Cookie', `auth_token=${jwtToken}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/`);
    
    return response;
  } catch (error) {
    console.error('Facebook callback error:', error);
    return Response.redirect(`${env.CLIENT_URL}/auth?error=facebook_callback_failed`, 302);
  }
}

// Logout handler
async function handleLogout(corsHeaders: HeadersInit): Promise<Response> {
  const response = new Response(JSON.stringify({ message: 'Logged out successfully' }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_token=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
      ...corsHeaders
    }
  });
  
  return response;
}
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import passport from "passport";
import { storage } from "./storage.js";
import { config } from "./config.js";

/**
 * Log user activity
 */
async function logUserActivity(
    userId: number,
    activityType: string,
    targetId?: number | null,
    details?: Record<string, any> | null,
    ipAddress?: string | null
): Promise<void> {
    try {
        await storage.addAuditLog({
            userId,
            activityType,
            targetId: targetId || null,
            details: details || null,
            ipAddress: ipAddress || null,
        });
    } catch (error) {
        console.error("Error logging user activity:", error);
    }
}

/**
 * Initialize OAuth strategies dynamically from database settings
 */
export async function initializeOAuthStrategies(): Promise<void> {
    try {
        // Load settings from database
        const settings = await storage.getAllSettings();
        console.log('[OAuth Init] Loading credentials from database...');

        const googleClientId = settings.google_client_id || config.googleClientId;
        const googleClientSecret = settings.google_client_secret || config.googleClientSecret;
        const googleEnabled = settings.google_oauth_enabled === 'true' || settings.google_oauth_enabled === true;

        const facebookAppId = settings.facebook_app_id || config.facebookAppId;
        const facebookAppSecret = settings.facebook_app_secret || config.facebookAppSecret;
        const facebookEnabled = settings.facebook_oauth_enabled === 'true' || settings.facebook_oauth_enabled === true;

        // Google OAuth Strategy
        if (googleEnabled && googleClientId && googleClientSecret) {
            console.log('✅ Google OAuth enabled - credentials loaded from database');

            const callbackURL = process.env.NODE_ENV === 'production'
                ? "https://phimgg.com/api/auth/google/callback"
                : "http://localhost:5000/api/auth/google/callback";

            passport.use(
                new GoogleStrategy(
                    {
                        clientID: googleClientId,
                        clientSecret: googleClientSecret,
                        callbackURL: callbackURL,
                    },
                    async (_accessToken, _refreshToken, profile, done) => {
                        try {
                            // Check if user already exists with this Google ID
                            let user = await storage.getUserByGoogleId(profile.id);

                            if (user) {
                                // User exists, log them in
                                await logUserActivity(user.id, "google_login", null, null, null);
                                const { password: _, ...userWithoutPassword } = user;
                                return done(null, userWithoutPassword);
                            }

                            // Check if user exists with same email
                            const emailUser = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
                            if (emailUser) {
                                // Link Google account to existing user
                                await storage.updateUser(emailUser.id, {
                                    googleId: profile.id,
                                    avatar: profile.photos?.[0]?.value || emailUser.avatar
                                });
                                await logUserActivity(emailUser.id, "google_account_linked", null, null, null);
                                const { password: _, ...userWithoutPassword } = emailUser;
                                return done(null, userWithoutPassword);
                            }

                            // Create new user
                            const newUser = await storage.createUser({
                                username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `user_${profile.id}`,
                                email: profile.emails?.[0]?.value || '',
                                password: '', // Empty password for OAuth users
                                role: 'normal',
                                status: 'active',
                                googleId: profile.id,
                                avatar: profile.photos?.[0]?.value || null,
                                displayName: profile.displayName || null
                            });

                            await logUserActivity(newUser.id, "google_register", null, null, null);
                            const { password: _, ...userWithoutPassword } = newUser;
                            return done(null, userWithoutPassword);
                        } catch (error) {
                            return done(error as Error);
                        }
                    }
                )
            );
        } else {
            console.log('ℹ️  Google OAuth disabled - no credentials in database or environment');
        }

        // Facebook OAuth Strategy  
        if (facebookEnabled && facebookAppId && facebookAppSecret) {
            console.log('✅ Facebook OAuth enabled - credentials loaded from database');

            const callbackURL = process.env.NODE_ENV === 'production'
                ? "https://phimgg.com/api/auth/facebook/callback"
                : "http://localhost:5000/api/auth/facebook/callback";

            passport.use(
                new FacebookStrategy(
                    {
                        clientID: facebookAppId,
                        clientSecret: facebookAppSecret,
                        callbackURL: callbackURL,
                        profileFields: ['id', 'displayName', 'photos']
                    },
                    async (_accessToken, _refreshToken, profile, done) => {
                        try {
                            // Check if user already exists with this Facebook ID
                            let user = await storage.getUserByFacebookId(profile.id);

                            if (user) {
                                // User exists, log them in
                                await logUserActivity(user.id, "facebook_login", null, null, null);
                                const { password: _, ...userWithoutPassword } = user;
                                return done(null, userWithoutPassword);
                            }

                            // For new users, create placeholder email
                            const placeholderEmail = `facebook_${profile.id}@facebook.local`;

                            // Check if a user exists with the placeholder email
                            const emailUser = await storage.getUserByEmail(placeholderEmail);
                            if (emailUser) {
                                // Link Facebook account to existing user
                                await storage.updateUser(emailUser.id, {
                                    facebookId: profile.id,
                                    avatar: profile.photos?.[0]?.value || emailUser.avatar
                                });
                                await logUserActivity(emailUser.id, "facebook_account_linked", null, null, null);
                                const { password: _, ...userWithoutPassword } = emailUser;
                                return done(null, userWithoutPassword);
                            }

                            // Create new user with placeholder email
                            const newUser = await storage.createUser({
                                username: profile.displayName || `facebook_user_${profile.id}`,
                                email: placeholderEmail,
                                password: '', // Empty password for OAuth users
                                role: 'normal',
                                status: 'active',
                                facebookId: profile.id,
                                avatar: profile.photos?.[0]?.value || null,
                                displayName: profile.displayName || null
                            });

                            await logUserActivity(newUser.id, "facebook_register", null, null, null);
                            const { password: _, ...userWithoutPassword } = newUser;
                            return done(null, userWithoutPassword);
                        } catch (error) {
                            return done(error as Error);
                        }
                    }
                )
            );
        } else {
            console.log('ℹ️  Facebook OAuth disabled - no credentials in database or environment');
        }
    } catch (error) {
        console.error('❌ Error loading OAuth credentials from database:', error);
        console.log('💡 OAuth strategies not initialized - check database connection');
        throw error;
    }
}

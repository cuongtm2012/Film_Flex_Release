import { Express, Request, Response } from "express";
import passport from "passport";

/**
 * Setup OAuth routes for Google and Facebook
 * This should be called after OAuth strategies are initialized
 */
export function setupOAuthRoutes(app: Express): void {
    // Google OAuth routes
    app.get("/api/auth/google",
        passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get("/api/auth/google/callback",
        passport.authenticate("google", {
            failureRedirect: "/auth?error=google_auth_failed",
            session: true
        }),
        (req: Request, res: Response) => {
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('[Google OAuth] Session save error:', saveErr);
                    return res.redirect("/auth?error=session_save_failed");
                }
                res.redirect("/");
            });
        }
    );

    // Facebook OAuth routes
    app.get("/api/auth/facebook",
        passport.authenticate("facebook")
    );

    app.get("/api/auth/facebook/callback",
        passport.authenticate("facebook", {
            failureRedirect: "/auth?error=facebook_auth_failed",
            session: true
        }),
        (req: Request, res: Response) => {
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('[Facebook OAuth] Session save error:', saveErr);
                    return res.redirect("/auth?error=session_save_failed");
                }
                res.redirect("/");
            });
        }
    );

    console.log('✅ OAuth routes registered');
}

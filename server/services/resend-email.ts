/**
 * Email Service using Resend API
 * Handles sending verification emails and other transactional emails
 */

import { Resend } from 'resend';

// Lazy initialization - will be created when needed
let resendClient: Resend | null = null;

/**
 * Get or create Resend client with API key from database
 */
async function getResendClient(): Promise<Resend | null> {
  if (resendClient) {
    return resendClient;
  }

  try {
    // Dynamically import storage to avoid circular dependencies
    const { storage } = await import('../storage.js');

    // Get Resend API key from database
    const apiKeySetting = await storage.getSystemSetting('resend_api_key');

    if (!apiKeySetting?.value) {
      console.warn('⚠️  Resend API key not found in database. Email sending will be disabled.');
      return null;
    }

    // Decrypt if encrypted
    const { decrypt } = await import('./encryption.js');
    const apiKey = apiKeySetting.encrypted ? decrypt(apiKeySetting.value) : apiKeySetting.value;

    resendClient = new Resend(apiKey);
    console.log('✅ Resend client initialized from database');
    return resendClient;
  } catch (error) {
    console.error('❌ Failed to initialize Resend client:', error);
    return null;
  }
}

export interface VerificationEmailOptions {
  to: string;
  token: string;
  username?: string;
}

/**
 * Send email verification link to user
 */
export async function sendVerificationEmail(options: VerificationEmailOptions): Promise<boolean> {
  try {
    const resend = await getResendClient();

    if (!resend) {
      console.warn('⚠️  Resend client not available. Skipping email send.');
      return false;
    }

    const { to, token, username } = options;
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

    const { data, error } = await resend.emails.send({
      from: 'PhimGG <onboarding@resend.dev>',
      to,
      subject: 'Xác thực tài khoản PhimGG',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xác thực tài khoản</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">PhimGG</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #dc2626; margin-top: 0;">Chào mừng đến với PhimGG!</h2>
            
            <p>Xin chào${username ? ` <strong>${username}</strong>` : ''},</p>
            
            <p>Cảm ơn bạn đã đăng ký tài khoản tại PhimGG. Để hoàn tất quá trình đăng ký, vui lòng click vào nút bên dưới để kích hoạt tài khoản:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold;
                        display: inline-block;
                        box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
                Kích hoạt tài khoản
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Hoặc copy link sau vào trình duyệt:<br>
              <a href="${verificationUrl}" style="color: #dc2626; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Lưu ý:</strong> Link kích hoạt có hiệu lực trong <strong>24 giờ</strong>. 
                Nếu bạn không yêu cầu đăng ký tài khoản này, vui lòng bỏ qua email này.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              © 2024 PhimGG. All rights reserved.<br>
              Email này được gửi tự động, vui lòng không trả lời.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }

    console.log('✅ Verification email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    return false;
  }
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail(to: string, username: string): Promise<boolean> {
  try {
    const resend = await getResendClient();

    if (!resend) {
      console.warn('⚠️  Resend client not available. Skipping welcome email.');
      return false;
    }

    const { data, error } = await resend.emails.send({
      from: 'PhimGG <onboarding@resend.dev>',
      to,
      subject: 'Chào mừng bạn đến với PhimGG!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Chào mừng</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎉 Chào mừng đến PhimGG!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Xin chào <strong>${username}</strong>,</p>
            
            <p>Tài khoản của bạn đã được kích hoạt thành công! Bạn có thể bắt đầu khám phá hàng ngàn bộ phim và series hấp dẫn trên PhimGG.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}" 
                 style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); 
                        color: white; 
                        padding: 15px 40px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold;
                        display: inline-block;">
                Bắt đầu xem phim
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © 2024 PhimGG. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }

    console.log('✅ Welcome email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
}

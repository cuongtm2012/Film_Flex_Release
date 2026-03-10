import sgMail from '@sendgrid/mail';
import { config } from '../config.js';

// Initialize SendGrid only if using local email service
if (!config.useCloudflareEmail && config.sendgridApiKey) {
  sgMail.setApiKey(config.sendgridApiKey);
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export interface PasswordResetEmailData {
  username: string;
  resetLink: string;
  expirationTime: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = config.fromEmail || 'noreply@filmflex.com';
    this.fromName = config.fromName || 'PhimGG';
  }

  /**
   * Send email via Cloudflare Worker
   */
  private async sendViaCloudflareWorker(options: EmailOptions): Promise<boolean> {
    try {
      const response = await fetch(`${config.cloudflareWorkerUrl}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: options.to,
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          subject: options.subject,
          text: options.text,
          html: options.html,
          templateId: options.templateId,
          dynamicTemplateData: options.dynamicTemplateData
        })
      });

      if (!response.ok) {
        console.error('Cloudflare Worker email failed:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      console.log(`Email sent via Cloudflare Worker to ${options.to}`);
      return result.success || true;
    } catch (error) {
      console.error('Failed to send email via Cloudflare Worker:', error);
      return false;
    }
  }

  /**
   * Send email via local SendGrid
   */
  private async sendViaLocalSendGrid(options: EmailOptions): Promise<boolean> {
    try {
      if (!config.sendgridApiKey) {
        console.log('SendGrid not configured locally. Email would be sent:', options);
        return true; // Return true in development mode
      }

      const msg: any = {
        to: options.to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: options.subject
      };

      // Add content based on what's provided
      if (options.templateId) {
        msg.templateId = options.templateId;
        if (options.dynamicTemplateData) {
          msg.dynamicTemplateData = options.dynamicTemplateData;
        }
      } else {
        // For regular emails, we need to provide either text or html content
        if (options.html || options.text) {
          msg.content = [];
          if (options.text) {
            msg.content.push({
              type: 'text/plain',
              value: options.text
            });
          }
          if (options.html) {
            msg.content.push({
              type: 'text/html',
              value: options.html
            });
          }
        }
      }

      await sgMail.send(msg);
      console.log(`Email sent via local SendGrid to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email via local SendGrid:', error);
      return false;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (config.useCloudflareEmail) {
        console.log('📧 Sending email via Cloudflare Worker...');
        return await this.sendViaCloudflareWorker(options);
      } else {
        console.log('📧 Sending email via local SendGrid...');
        return await this.sendViaLocalSendGrid(options);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string, 
    data: PasswordResetEmailData
  ): Promise<boolean> {
    const resetEmailHtml = this.generatePasswordResetHtml(data);
    const resetEmailText = this.generatePasswordResetText(data);

    return await this.sendEmail({
      to: email,
      subject: '🔐 Reset Your PhimGG Password',
      html: resetEmailHtml,
      text: resetEmailText
    });
  }

  /**
   * Send welcome email for new users
   */
  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const welcomeHtml = this.generateWelcomeHtml(username);
    const welcomeText = this.generateWelcomeText(username);

    return await this.sendEmail({
      to: email,
      subject: '🎬 Welcome to PhimGG - Your Gateway to Premium Entertainment!',
      html: welcomeHtml,
      text: welcomeText
    });
  }

  /**
   * Send account activation email
   */
  async sendActivationEmail(
    email: string, 
    username: string, 
    activationLink: string
  ): Promise<boolean> {
    const activationHtml = this.generateActivationHtml(username, activationLink);
    const activationText = this.generateActivationText(username, activationLink);

    return await this.sendEmail({
      to: email,
      subject: '✅ Activate Your PhimGG Account',
      html: activationHtml,
      text: activationText
    });
  }

  /**
   * Generate password reset HTML template
   */
  private generatePasswordResetHtml(data: PasswordResetEmailData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your PhimGG Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #0a0a0a;
        }
        .container {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%);
            border-radius: 12px;
            padding: 40px;
            border: 1px solid #dc2626;
            box-shadow: 0 10px 30px rgba(220, 38, 38, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .title {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #9ca3af;
            font-size: 16px;
        }
        .content {
            color: #e5e7eb;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
        }
        .warning {
            background-color: #374151;
            border: 1px solid #6b7280;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            color: #d1d5db;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #374151;
            color: #9ca3af;
            font-size: 14px;
        }
        .film-strip {
            height: 4px;
            background: linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%);
            margin: 20px 0;
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎬 PhimGG</div>
            <div class="film-strip"></div>
            <h1 class="title">Reset Your Password</h1>
            <p class="subtitle">We received a request to reset your password</p>
        </div>
        
        <div class="content">
            <p>Hi <strong>${data.username}</strong>,</p>
            <p>You requested to reset your password for your PhimGG account. Click the button below to create a new password:</p>
        </div>
        
        <div style="text-align: center;">
            <a href="${data.resetLink}" class="button">Reset My Password</a>
        </div>
        
        <div class="warning">
            <p><strong>⚠️ Important:</strong></p>
            <ul>
                <li>This link will expire in <strong>${data.expirationTime}</strong></li>
                <li>If you didn't request this reset, you can safely ignore this email</li>
                <li>For your security, this link can only be used once</li>
            </ul>
        </div>
        
        <div class="content">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc2626; font-family: monospace; background-color: #1f2937; padding: 10px; border-radius: 4px;">
                ${data.resetLink}
            </p>
        </div>
        
        <div class="footer">
            <div class="film-strip"></div>
            <p>🎥 Keep watching amazing content on PhimGG!</p>
            <p>If you have any questions, contact our support team.</p>
            <p style="margin-top: 20px;">
                © 2025 PhimGG. All rights reserved.<br>
                This email was sent automatically. Please do not reply.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate password reset text template (fallback)
   */
  private generatePasswordResetText(data: PasswordResetEmailData): string {
    return `
🎬 PhimGG - Reset Your Password

Hi ${data.username},

You requested to reset your password for your PhimGG account.

Reset your password by clicking this link:
${data.resetLink}

Important:
- This link will expire in ${data.expirationTime}
- If you didn't request this reset, you can safely ignore this email
- For your security, this link can only be used once

If the link doesn't work, copy and paste it into your browser.

🎥 Keep watching amazing content on PhimGG!

© 2025 PhimGG. All rights reserved.
This email was sent automatically. Please do not reply.
`;
  }

  /**
   * Generate welcome email HTML template
   */
  private generateWelcomeHtml(username: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to PhimGG</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #0a0a0a;
        }
        .container {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%);
            border-radius: 12px;
            padding: 40px;
            border: 1px solid #dc2626;
            box-shadow: 0 10px 30px rgba(220, 38, 38, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .title {
            color: #ffffff;
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #9ca3af;
            font-size: 18px;
        }
        .content {
            color: #e5e7eb;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .film-strip {
            height: 4px;
            background: linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%);
            margin: 20px 0;
            border-radius: 2px;
        }
        .features {
            background-color: #1f2937;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .feature {
            margin: 10px 0;
            color: #d1d5db;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #374151;
            color: #9ca3af;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎬 PhimGG</div>
            <div class="film-strip"></div>
            <h1 class="title">Welcome to PhimGG!</h1>
            <p class="subtitle">Your gateway to premium entertainment</p>
        </div>
        
        <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>Welcome to the PhimGG family! 🎉 Your account has been successfully created and you're ready to explore thousands of amazing movies and TV shows.</p>
        </div>
        
        <div class="features">
            <h3 style="color: #dc2626; margin-top: 0;">🎥 What you can do now:</h3>
            <div class="feature">🔍 Browse our extensive movie and TV show library</div>
            <div class="feature">📚 Create your personal watchlist</div>
            <div class="feature">⭐ Rate and review your favorite content</div>
            <div class="feature">🎯 Get personalized recommendations</div>
            <div class="feature">📱 Watch on any device, anywhere</div>
        </div>
        
        <div class="content">
            <p>Start exploring now and discover your next favorite movie or series!</p>
        </div>
        
        <div class="footer">
            <div class="film-strip"></div>
            <p>🍿 Happy watching!</p>
            <p>© 2025 PhimGG. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate welcome email text template (fallback)
   */
  private generateWelcomeText(username: string): string {
    return `
🎬 PhimGG - Welcome!

Hi ${username},

Welcome to the PhimGG family! 🎉 Your account has been successfully created and you're ready to explore thousands of amazing movies and TV shows.

What you can do now:
🔍 Browse our extensive movie and TV show library
📚 Create your personal watchlist
⭐ Rate and review your favorite content
🎯 Get personalized recommendations
📱 Watch on any device, anywhere

Start exploring now and discover your next favorite movie or series!

🍿 Happy watching!

© 2025 PhimGG. All rights reserved.
`;
  }

  /**
   * Generate activation email HTML template
   */
  private generateActivationHtml(username: string, activationLink: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activate Your PhimGG Account</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #0a0a0a;
        }
        .container {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%);
            border-radius: 12px;
            padding: 40px;
            border: 1px solid #dc2626;
            box-shadow: 0 10px 30px rgba(220, 38, 38, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
        }
        .title {
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .content {
            color: #e5e7eb;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        }
        .film-strip {
            height: 4px;
            background: linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #dc2626 100%);
            margin: 20px 0;
            border-radius: 2px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #374151;
            color: #9ca3af;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎬 PhimGG</div>
            <div class="film-strip"></div>
            <h1 class="title">Activate Your Account</h1>
        </div>
        
        <div class="content">
            <p>Hi <strong>${username}</strong>,</p>
            <p>Thank you for signing up for PhimGG! To complete your registration and start enjoying premium entertainment, please activate your account by clicking the button below:</p>
        </div>
        
        <div style="text-align: center;">
            <a href="${activationLink}" class="button">Activate My Account</a>
        </div>
        
        <div class="content">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc2626; font-family: monospace; background-color: #1f2937; padding: 10px; border-radius: 4px;">
                ${activationLink}
            </p>
        </div>
        
        <div class="footer">
            <div class="film-strip"></div>
            <p>© 2025 PhimGG. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate activation email text template (fallback)
   */
  private generateActivationText(username: string, activationLink: string): string {
    return `
🎬 PhimGG - Activate Your Account

Hi ${username},

Thank you for signing up for PhimGG! To complete your registration and start enjoying premium entertainment, please activate your account:

${activationLink}

© 2025 PhimGG. All rights reserved.
`;
  }
}

// Create and export singleton instance
export const emailService = new EmailService();
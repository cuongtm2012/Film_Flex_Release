import { Env } from '../types/env';

export interface EmailOptions {
  to: string;
  from: {
    email: string;
    name: string;
  };
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

export class EmailService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Send email using SendGrid API via Cloudflare Worker
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.env.SENDGRID_API_KEY) {
        console.error('SENDGRID_API_KEY not configured in Cloudflare Worker');
        return false;
      }

      const msg: any = {
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject
          }
        ],
        from: options.from,
        content: []
      };

      // Add template ID and dynamic data if provided
      if (options.templateId) {
        msg.template_id = options.templateId;
        if (options.dynamicTemplateData) {
          msg.personalizations[0].dynamic_template_data = options.dynamicTemplateData;
        }
      } else {
        // Add content for regular emails
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

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(msg)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SendGrid API error:', response.status, errorText);
        return false;
      }

      console.log(`Email sent successfully via Cloudflare Worker to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email via Cloudflare Worker:', error);
      return false;
    }
  }
}
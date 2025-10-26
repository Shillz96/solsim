// Email service for sending verification and password reset emails
import { Resend } from 'resend';
import crypto from 'crypto';

// Lazy initialization to allow environment variables to be loaded first
let resend: Resend | null = null;
let isInitialized = false;

function getResendClient(): Resend | null {
  if (!isInitialized) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not configured - email functionality will be disabled');
      isInitialized = true;
      return null;
    }

    resend = new Resend(RESEND_API_KEY);
    isInitialized = true;
    console.log('✅ Resend email service initialized');
  }

  return resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'OneUpSol <noreply@oneupsol.fun>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class EmailService {
  /**
   * Generate a secure random token for email verification or password reset
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate token expiry time (default 24 hours from now)
   */
  static generateTokenExpiry(hoursFromNow: number = 24): Date {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(email: string, token: string, username: string): Promise<boolean> {
    const client = getResendClient();
    if (!client) {
      console.error('❌ Email service not configured - RESEND_API_KEY is missing');
      console.error('⚠️  Please set RESEND_API_KEY environment variable to enable email functionality');
      return false;
    }

    // Validate email format
    if (!email || !this.isValidEmailFormat(email)) {
      console.error(`❌ Invalid email format: ${email}`);
      return false;
    }

    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    try {
      console.log(`📤 Sending verification email to: ${email}`);
      console.log(`🔗 Verification URL: ${verificationUrl.substring(0, 50)}...`);

      const { data, error } = await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Verify your VirtualSol account',
        html: this.getVerificationEmailTemplate(username, verificationUrl),
      });

      if (error) {
        console.error('❌ Resend API error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return false;
      }

      console.log(`✅ Verification email sent successfully to ${email}`);
      console.log(`📧 Resend email ID: ${data?.id}`);
      return true;
    } catch (error: any) {
      console.error('❌ Exception sending verification email:', error.message);
      console.error('Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Validate email format
   */
  private static isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254 && !email.includes('@wallet.virtualsol.fun');
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, token: string, username: string): Promise<boolean> {
    const client = getResendClient();
    if (!client) {
      console.warn('Email service not configured - skipping password reset email');
      return false;
    }

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    try {
      const { data, error} = await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Reset your VirtualSol password',
        html: this.getPasswordResetEmailTemplate(username, resetUrl),
      });

      if (error) {
        console.error('Failed to send password reset email:', error);
        return false;
      }

      console.log(`✅ Password reset email sent to ${email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email after successful verification
   */
  static async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const client = getResendClient();
    if (!client) {
      console.warn('Email service not configured - skipping welcome email');
      return false;
    }

    try {
      const { data, error } = await client.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Welcome to VirtualSol - Your paper trading journey begins!',
        html: this.getWelcomeEmailTemplate(username),
      });

      if (error) {
        console.error('Failed to send welcome email:', error);
        return false;
      }

      console.log(`✅ Welcome email sent to ${email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Email verification template
   */
  private static getVerificationEmailTemplate(username: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your VirtualSol account</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">VirtualSol</h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Solana Paper Trading</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Welcome, ${username}!</h2>
                    <p style="color: #4a4a4a; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                      Thank you for signing up with VirtualSol. To get started with paper trading on Solana, please verify your email address by clicking the button below:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #6a6a6a; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
                    </p>

                    <p style="color: #6a6a6a; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                      This verification link will expire in 24 hours.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="color: #8a8a8a; margin: 0 0 10px 0; font-size: 14px;">
                      If you didn't create a VirtualSol account, you can safely ignore this email.
                    </p>
                    <p style="color: #8a8a8a; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} VirtualSol. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  private static getPasswordResetEmailTemplate(username: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your VirtualSol password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">VirtualSol</h1>
                    <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Solana Paper Trading</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Password Reset Request</h2>
                    <p style="color: #4a4a4a; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                      Hi ${username},
                    </p>
                    <p style="color: #4a4a4a; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #6a6a6a; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                      Or copy and paste this link into your browser:<br>
                      <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                    </p>

                    <p style="color: #6a6a6a; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                      This password reset link will expire in 1 hour.
                    </p>

                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 30px;">
                      <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
                        <strong>Security tip:</strong> If you didn't request this password reset, please ignore this email or contact support if you have concerns about your account security.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="color: #8a8a8a; margin: 0 0 10px 0; font-size: 14px;">
                      This link was requested from IP address. If you didn't request this, please contact support.
                    </p>
                    <p style="color: #8a8a8a; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} VirtualSol. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Welcome email template
   */
  private static getWelcomeEmailTemplate(username: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to VirtualSol!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">🎉 Welcome to VirtualSol!</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">You're all set, ${username}!</h2>
                    <p style="color: #4a4a4a; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                      Your email has been verified and your account is now active. You're ready to start your paper trading journey on Solana!
                    </p>

                    <div style="background-color: #f0f7ff; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0;">
                      <h3 style="color: #1a1a1a; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">Getting Started</h3>
                      <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; font-size: 15px; line-height: 1.8;">
                        <li>You've been credited with <strong>10 virtual SOL</strong> to start trading</li>
                        <li>Explore trending tokens and make your first trade</li>
                        <li>Track your portfolio performance in real-time</li>
                        <li>Compete on the leaderboard with other traders</li>
                        <li>Connect your wallet for enhanced features</li>
                      </ul>
                    </div>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${FRONTEND_URL}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                            Start Trading Now
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #6a6a6a; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; text-align: center;">
                      Happy trading! 📈
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f8f8; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="color: #8a8a8a; margin: 0 0 10px 0; font-size: 14px;">
                      Need help? Check out our <a href="${FRONTEND_URL}/help" style="color: #667eea; text-decoration: none;">Help Center</a>
                    </p>
                    <p style="color: #8a8a8a; margin: 0; font-size: 12px;">
                      © ${new Date().getFullYear()} VirtualSol. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

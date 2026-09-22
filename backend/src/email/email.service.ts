import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailDeliveryResult, SendEmailOptions } from './email.interface';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.provider = this.config.get<string>('EMAIL_PROVIDER', 'logger');
    this.appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult> {
    try {
      if (this.provider === 'logger' || this.provider === 'development') {
        this.logger.log(
          `\n================= [OUTGOING EMAIL (${this.provider.toUpperCase()})] =================\n` +
          `To: ${options.to}\n` +
          `Subject: ${options.subject}\n` +
          `Body:\n${options.text || options.html}\n` +
          `========================================================================`
        );
        return { success: true, messageId: `mock-${Date.now()}` };
      }

      // Placeholder for AWS SES or SMTP integration
      this.logger.warn(`Email provider '${this.provider}' not fully configured. Defaulting to logged delivery.`);
      return { success: true, messageId: `ses-fallback-${Date.now()}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
      this.logger.error(`Failed to deliver email to ${options.to}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  async sendVerificationEmail(to: string, token: string, fullName: string): Promise<EmailDeliveryResult> {
    const verificationUrl = `${this.appUrl}/api/v1/auth/verify-email?token=${token}`;
    const subject = 'Verify your email address - Marketplace';
    const text = `Hello ${fullName},\n\nThank you for registering. Please verify your email using the following link or token:\n${verificationUrl}\n\nToken: ${token}\n\nThis token will expire in 24 hours.\n\nRegards,\nMarketplace Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2>Verify Your Email</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Thank you for creating an account with us. Please verify your email address to activate your account:</p>
        <p><a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>Or use the verification token: <code>${token}</code></p>
        <p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours. If you did not sign up for this account, please disregard this email.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html, text });
  }

  async sendPasswordResetEmail(to: string, token: string, fullName: string): Promise<EmailDeliveryResult> {
    const resetUrl = `${this.appUrl}/api/v1/auth/reset-password?token=${token}`;
    const subject = 'Password Reset Request - Marketplace';
    const text = `Hello ${fullName},\n\nWe received a request to reset your password. Use the following link or token to reset your password:\n${resetUrl}\n\nToken: ${token}\n\nThis token will expire in 30 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nMarketplace Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>You recently requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="background-color: #ef4444; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>Or use the reset token: <code>${token}</code></p>
        <p style="color: #64748b; font-size: 14px;">This link will expire in 30 minutes. If you did not make this request, you can safely ignore this email.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html, text });
  }
}

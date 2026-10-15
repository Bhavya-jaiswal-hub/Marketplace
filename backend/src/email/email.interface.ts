export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IEmailService {
  sendEmail(options: SendEmailOptions): Promise<EmailDeliveryResult>;
  sendVerificationEmail(to: string, token: string, fullName: string): Promise<EmailDeliveryResult>;
  sendPasswordResetEmail(to: string, token: string, fullName: string): Promise<EmailDeliveryResult>;
}

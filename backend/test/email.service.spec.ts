import { ConfigService } from '@nestjs/config';
import { EmailService } from '../src/email/email.service';

describe('EmailService', () => {
  let service: EmailService;
  let config: { get: jest.Mock };

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'EMAIL_PROVIDER') return 'logger';
        if (key === 'APP_URL') return 'http://localhost:3000';
        return defaultValue;
      }),
    };
    service = new EmailService(config as unknown as ConfigService);
  });

  it('formats and sends a verification email in logger mode', async () => {
    const result = await service.sendVerificationEmail('customer@example.com', 'test-token-123', 'John Doe');
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('formats and sends a password reset email in logger mode', async () => {
    const result = await service.sendPasswordResetEmail('customer@example.com', 'reset-token-456', 'John Doe');
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});

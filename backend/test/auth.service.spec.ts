import { AccountStatus, TokenStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma.service';
import { EmailService } from '../src/email/email.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: { sign: jest.Mock };
  let emailService: { sendVerificationEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { upsert: jest.fn() },
      session: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as PrismaService;
    jwt = { sign: jest.fn().mockReturnValue('access-token') };
    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    };
    service = new AuthService(prisma, jwt as unknown as JwtService, emailService as unknown as EmailService);
  });

  it('registers a pending customer with a hashed password and verification hash', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.upsert.mockResolvedValue({ id: 'role-id' });
    prisma.user.create.mockResolvedValue({ id: 'user-id', accountStatus: AccountStatus.PENDING });

    const result = await service.register({
      fullName: '  Customer One ',
      email: 'CUSTOMER@EXAMPLE.COM',
      password: 'strong-password',
      accountType: 'CUSTOMER',
    });

    expect(result).toEqual({ userId: 'user-id', status: AccountStatus.PENDING, message: 'Verification instructions have been sent.' });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'customer@example.com', roleId: 'role-id' }),
      }),
    );
    const passwordHash = prisma.user.create.mock.calls[0][0].data.passwordHash;
    expect(passwordHash).not.toBe('strong-password');
    expect(await bcrypt.compare('strong-password', passwordHash)).toBe(true);
    expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects login before email verification', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      passwordHash: await bcrypt.hash('strong-password', 4),
      emailVerified: false,
      accountStatus: AccountStatus.PENDING,
      role: { name: 'CUSTOMER' },
    });

    await expect(service.login({ email: 'user@example.com', password: 'strong-password' })).rejects.toThrow('Email not verified');
    expect(prisma.session.create).not.toHaveBeenCalled();
  });

  it('rotates an active refresh token transactionally', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'refresh-id', userId: 'user-id', sessionId: 'session-id', status: TokenStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 60_000), session: { status: 'ACTIVE' }, user: { role: { name: 'CUSTOMER' } },
    });
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.refresh('refresh-token');

    expect(result).toEqual({ accessToken: 'access-token', refreshToken: expect.any(String) });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'user-id', role: 'CUSTOMER', sessionId: 'session-id' });
  });

  it('revokes the current session and active refresh tokens on logout', async () => {
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.logout('user-id', 'session-id')).resolves.toEqual({ success: true });
    expect(prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-id', userId: 'user-id' } }));
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionId: 'session-id', userId: 'user-id', status: TokenStatus.ACTIVE } }));
  });

  it('sends password reset email on forgotPassword', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      fullName: 'John Doe',
    });
    prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'token-id' });

    const result = await service.forgotPassword('user@example.com');
    expect(result).toEqual({ message: 'If the account exists, reset instructions will be sent.' });
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('uses a reset token once and revokes active sessions', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 'reset-id', userId: 'user-id', status: TokenStatus.ACTIVE, expiresAt: new Date(Date.now() + 60_000) });
    prisma.$transaction.mockResolvedValue([]);

    await expect(service.resetPassword({ token: 'reset-token', newPassword: 'new-password' })).resolves.toEqual({ success: true });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

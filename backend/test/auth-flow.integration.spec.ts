import { AccountStatus, TokenStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/auth/auth.service';
import { RolesGuard } from '../src/auth/roles.guard';
import { Reflector } from '@nestjs/core';
import { EmailService } from '../src/email/email.service';

describe('Authentication & RBAC Lifecycle Integration', () => {
  let authService: AuthService;
  let emailService: { sendVerificationEmail: jest.Mock; sendPasswordResetEmail: jest.Mock };
  let jwtService: JwtService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  // In-memory mock database state
  const mockDb = {
    users: new Map<string, any>(),
    roles: new Map<string, any>(),
    sessions: new Map<string, any>(),
    refreshTokens: new Map<string, any>(),
    passwordResetTokens: new Map<string, any>(),
  };

  beforeEach(() => {
    mockDb.users.clear();
    mockDb.roles.clear();
    mockDb.sessions.clear();
    mockDb.refreshTokens.clear();
    mockDb.passwordResetTokens.clear();

    mockDb.roles.set('CUSTOMER', { id: 'role-customer-id', name: 'CUSTOMER' });
    mockDb.roles.set('SELLER', { id: 'role-seller-id', name: 'SELLER' });
    mockDb.roles.set('ADMIN', { id: 'role-admin-id', name: 'ADMIN' });

    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.email) {
            for (const user of mockDb.users.values()) {
              if (user.email === where.email) {
                return { ...user, role: mockDb.roles.get(user.accountType) };
              }
            }
          }
          if (where.id) {
            const user = mockDb.users.get(where.id);
            return user ? { ...user, role: mockDb.roles.get(user.accountType) } : null;
          }
          return null;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          for (const user of mockDb.users.values()) {
            if (where.emailVerificationHash && user.emailVerificationHash === where.emailVerificationHash) {
              return user;
            }
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const id = `user-${mockDb.users.size + 1}`;
          const user = { id, accountStatus: AccountStatus.PENDING, emailVerified: false, ...data };
          mockDb.users.set(id, user);
          return user;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const user = mockDb.users.get(where.id);
          const updated = { ...user, ...data };
          mockDb.users.set(where.id, updated);
          return updated;
        }),
      },
      role: {
        upsert: jest.fn(async ({ where, create }: any) => {
          const role = mockDb.roles.get(where.name) || { id: `role-${where.name.toLowerCase()}`, ...create };
          mockDb.roles.set(where.name, role);
          return role;
        }),
      },
      session: {
        create: jest.fn(async ({ data }: any) => {
          const id = `session-${mockDb.sessions.size + 1}`;
          const session = { id, status: 'ACTIVE', ...data };
          mockDb.sessions.set(id, session);
          return session;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          const s = mockDb.sessions.get(where.id);
          if (s && s.userId === where.userId && s.status === (where.status || s.status)) return s;
          return null;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return Array.from(mockDb.sessions.values()).filter((s) => s.userId === where.userId);
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const s = mockDb.sessions.get(where.id);
          const updated = { ...s, ...data };
          mockDb.sessions.set(where.id, updated);
          return updated;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [id, s] of mockDb.sessions.entries()) {
            if (s.userId === where.userId && (!where.id || s.id === where.id) && (!where.status || s.status === where.status)) {
              mockDb.sessions.set(id, { ...s, ...data });
              count++;
            }
          }
          return { count };
        }),
      },
      refreshToken: {
        create: jest.fn(async ({ data }: any) => {
          const id = `rt-${mockDb.refreshTokens.size + 1}`;
          const token = { id, status: TokenStatus.ACTIVE, ...data };
          mockDb.refreshTokens.set(token.tokenHash, token);
          return token;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          const token = mockDb.refreshTokens.get(where.tokenHash);
          if (!token) return null;
          const user = mockDb.users.get(token.userId);
          const session = mockDb.sessions.get(token.sessionId);
          return { ...token, user: { ...user, role: mockDb.roles.get(user.accountType) }, session };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          for (const [hash, token] of mockDb.refreshTokens.entries()) {
            if (token.id === where.id) {
              const updated = { ...token, ...data };
              mockDb.refreshTokens.set(hash, updated);
              return updated;
            }
          }
          return null;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [hash, token] of mockDb.refreshTokens.entries()) {
            if (token.userId === where.userId && (!where.sessionId || token.sessionId === where.sessionId) && (!where.status || token.status === where.status)) {
              mockDb.refreshTokens.set(hash, { ...token, ...data });
              count++;
            }
          }
          return { count };
        }),
      },
      passwordResetToken: {
        create: jest.fn(async ({ data }: any) => {
          const id = `prt-${mockDb.passwordResetTokens.size + 1}`;
          const token = { id, status: TokenStatus.ACTIVE, ...data };
          mockDb.passwordResetTokens.set(token.tokenHash, token);
          return token;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return mockDb.passwordResetTokens.get(where.tokenHash) || null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          for (const [hash, token] of mockDb.passwordResetTokens.entries()) {
            if (token.id === where.id) {
              const updated = { ...token, ...data };
              mockDb.passwordResetTokens.set(hash, updated);
              return updated;
            }
          }
          return null;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const [hash, token] of mockDb.passwordResetTokens.entries()) {
            if (token.userId === where.userId && (!where.status || token.status === where.status)) {
              mockDb.passwordResetTokens.set(hash, { ...token, ...data });
              count++;
            }
          }
          return { count };
        }),
      },
      $transaction: jest.fn(async (promises: any[]) => Promise.all(promises)),
    };

    jwtService = new JwtService({ secret: 'integration-test-secret' });
    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ success: true }),
    };
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    authService = new AuthService(mockPrisma, jwtService, emailService as unknown as EmailService);
  });

  it('runs the complete authentication lifecycle: register -> verify -> login -> refresh -> RBAC check -> logout', async () => {
    // 1. Register
    const regResult = await authService.register({
      fullName: 'Test Seller',
      email: 'seller@test.com',
      password: 'StrongPassword123!',
      accountType: 'SELLER',
    });
    expect(regResult.status).toBe(AccountStatus.PENDING);
    expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);

    const verificationCall = emailService.sendVerificationEmail.mock.calls[0];
    const rawVerificationToken = verificationCall[1];

    // 2. Cannot login before verification
    await expect(authService.login({
      email: 'seller@test.com',
      password: 'StrongPassword123!',
    })).rejects.toThrow('Email not verified');

    // 3. Verify Email
    const verifyResult = await authService.verifyEmail(rawVerificationToken);
    expect(verifyResult.status).toBe(AccountStatus.ACTIVE);

    // 4. Login after verification
    const loginResult: any = await authService.login({
      email: 'seller@test.com',
      password: 'StrongPassword123!',
    });
    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    expect(loginResult.user.role).toBe('SELLER');

    // 5. Token Refresh Rotation
    const refreshResult: any = await authService.refresh(loginResult.refreshToken);
    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).toBeDefined();
    expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken);

    // 6. Old refresh token cannot be reused
    await expect(authService.refresh(loginResult.refreshToken)).rejects.toThrow('Invalid refresh token');

    // 7. RBAC Check with RolesGuard
    const decoded: any = jwtService.verify(refreshResult.accessToken);
    const mockSellerContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: decoded.sub, role: decoded.role, sessionId: decoded.sessionId } }),
      }),
    } as unknown as any;

    // Seller is allowed on SELLER route
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SELLER', 'ADMIN']);
    expect(rolesGuard.canActivate(mockSellerContext)).toBe(true);

    // Seller is forbidden on ADMIN route
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    expect(() => rolesGuard.canActivate(mockSellerContext)).toThrow('Access denied: requires one of [ADMIN] role');

    // 8. Logout
    const logoutResult = await authService.logout(decoded.sub, decoded.sessionId);
    expect(logoutResult.success).toBe(true);

    // 9. Session is now revoked
    const isSessionActive = await authService.isSessionActive(decoded.sub, decoded.sessionId);
    expect(isSessionActive).toBe(false);
  });
});

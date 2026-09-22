import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, TokenStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ userId: string; status: AccountStatus; message: string }> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Unable to register this account');

    const roleName = dto.accountType === 'SELLER' ? 'SELLER' : 'CUSTOMER';
    const role = await this.prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} account` },
    });
    const verificationToken = randomBytes(32).toString('hex');
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(), email, passwordHash: await bcrypt.hash(dto.password, 12),
        accountType: dto.accountType, roleId: role.id,
        emailVerificationHash: hashToken(verificationToken),
        emailVerificationExpiresAt: daysFromNow(1),
      },
    });

    await this.emailService.sendVerificationEmail(user.email, verificationToken, user.fullName);

    return { userId: user.id, status: user.accountStatus, message: 'Verification instructions have been sent.' };
  }


  async verifyEmail(token: string): Promise<{ status: AccountStatus }> {
    const user = await this.prisma.user.findFirst({ where: { emailVerificationHash: hashToken(token) } });
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
    if (user.accountStatus === AccountStatus.BLOCKED) throw new UnauthorizedException('Account is blocked');
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, accountStatus: AccountStatus.ACTIVE, emailVerificationHash: null, emailVerificationExpiresAt: null },
    });
    return { status: updated.accountStatus };
  }

  async login(dto: LoginDto): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() }, include: { role: true } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) throw new UnauthorizedException('Invalid credentials');
    if (!user.emailVerified) throw new UnauthorizedException('Email not verified');
    if (user.accountStatus === AccountStatus.SUSPENDED || user.accountStatus === AccountStatus.BLOCKED || user.accountStatus === AccountStatus.INACTIVE) throw new UnauthorizedException('Account is not active');

    const session = await this.prisma.session.create({ data: { userId: user.id, expiresAt: daysFromNow(30), createdFrom: 'api' } });
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({ data: { userId: user.id, sessionId: session.id, tokenHash: hashToken(refreshToken), expiresAt: daysFromNow(30) } });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return { accessToken: this.jwt.sign({ sub: user.id, role: user.role.name, sessionId: session.id }), refreshToken, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role.name } };
  }

  async me(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) throw new UnauthorizedException('Account not found');
    return { id: user.id, fullName: user.fullName, email: user.email, accountType: user.accountType, accountStatus: user.accountStatus, role: user.role.name };
  }

  async refresh(rawToken: string): Promise<Record<string, unknown>> {
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(rawToken) }, include: { user: { include: { role: true } }, session: true } });
    if (!token || token.status !== TokenStatus.ACTIVE || token.expiresAt < new Date() || token.session.status !== 'ACTIVE') throw new UnauthorizedException('Invalid refresh token');
    const nextToken = randomBytes(48).toString('hex');
    await this.prisma.$transaction([
      this.prisma.refreshToken.update({ where: { id: token.id }, data: { status: TokenStatus.REVOKED, revokedAt: new Date(), revocationReason: 'rotated' } }),
      this.prisma.refreshToken.create({ data: { userId: token.userId, sessionId: token.sessionId, tokenHash: hashToken(nextToken), expiresAt: daysFromNow(30) } }),
      this.prisma.session.update({ where: { id: token.sessionId }, data: { lastActivityAt: new Date() } }),
    ]);
    return { accessToken: this.jwt.sign({ sub: token.userId, role: token.user.role.name, sessionId: token.sessionId }), refreshToken: nextToken };
  }

  async logout(userId: string, sessionId: string): Promise<{ success: true }> {
    await this.prisma.session.updateMany({ where: { id: sessionId, userId }, data: { status: 'REVOKED', revokedAt: new Date() } });
    await this.prisma.refreshToken.updateMany({ where: { sessionId, userId, status: TokenStatus.ACTIVE }, data: { status: TokenStatus.REVOKED, revokedAt: new Date(), revocationReason: 'logout' } });
    return { success: true };
  }

  async logoutAll(userId: string): Promise<{ success: true }> {
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { userId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId, status: TokenStatus.ACTIVE }, data: { status: TokenStatus.REVOKED, revokedAt: new Date(), revocationReason: 'logout-all' } }),
    ]);
    return { success: true };
  }

  async listSessions(userId: string): Promise<Array<Record<string, unknown>>> {
    const sessions = await this.prisma.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return sessions.map((session) => ({ id: session.id, status: session.status, expiresAt: session.expiresAt, lastActivityAt: session.lastActivityAt, createdFrom: session.createdFrom, createdAt: session.createdAt }));
  }

  async isSessionActive(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId, status: 'ACTIVE', expiresAt: { gt: new Date() } } });
    return Boolean(session);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) return { message: 'If the account exists, reset instructions will be sent.' };
    const resetToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, status: TokenStatus.ACTIVE }, data: { status: TokenStatus.REVOKED, revokedAt: new Date() } });
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(resetToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });

    await this.emailService.sendPasswordResetEmail(user.email, resetToken, user.fullName);

    return { message: 'If the account exists, reset instructions will be sent.' };
  }


  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    const token = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(dto.token) } });
    if (!token || token.status !== TokenStatus.ACTIVE || token.expiresAt < new Date()) throw new UnauthorizedException('Invalid or expired reset token');
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: token.userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } }),
      this.prisma.passwordResetToken.update({ where: { id: token.id }, data: { status: TokenStatus.USED, usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: token.userId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } }),
    ]);
    return { success: true };
  }
}

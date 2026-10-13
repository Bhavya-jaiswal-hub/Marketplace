import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

export interface AuthenticatedRequest {
  user: { sub: string; role: string; roleName?: string; sessionId: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { headers: Record<string, string> }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const payload = this.jwtService.verify(authorization.substring(7));
      request.user = {
        ...payload,
        role: payload.role || payload.roleName,
        roleName: payload.roleName || payload.role,
      };
      const session = await this.prisma.session.findFirst({ where: { id: request.user.sessionId, userId: request.user.sub, status: 'ACTIVE', expiresAt: { gt: new Date() } } });
      if (!session) throw new UnauthorizedException('Session is no longer active');
      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}

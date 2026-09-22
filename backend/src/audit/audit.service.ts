import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface LogActionParams {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(params: LogActionParams): Promise<any> {
    try {
      const record = await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          previousValue: params.previousValue ?? undefined,
          newValue: params.newValue ?? undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
        },
      });

      this.logger.log(
        `Audit Log [${params.action}] on [${params.resourceType}:${params.resourceId}] by User [${params.userId ?? 'SYSTEM'}]`,
      );
      return record;
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`, (error as Error).stack);
      // Audit log creation failure should not break critical transactions if handled gracefully, but we log strictly
      return null;
    }
  }

  async getResourceAuditLogs(resourceType: string, resourceId: string): Promise<any[]> {
    return this.prisma.auditLog.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            accountType: true,
          },
        },
      },
    });
  }
}

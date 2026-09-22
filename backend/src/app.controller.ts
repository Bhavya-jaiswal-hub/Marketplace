import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { PrismaService } from './prisma.service';

@Controller('health')
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(@Res() res: FastifyReply): Promise<void> {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    let overallHealthy = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - startTime;
    } catch (err: any) {
      dbStatus = 'unreachable';
      overallHealthy = false;
    }

    const memoryUsage = process.memoryUsage();

    const responsePayload = {
      status: overallHealthy ? 'ok' : 'degraded',
      service: 'marketplace-backend',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      memory: {
        rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      },
    };

    res.status(overallHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).send(responsePayload);
  }

  @Get('liveness')
  getLiveness(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('readiness')
  async getReadiness(@Res() res: FastifyReply): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).send({
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        status: 'not_ready',
        database: 'disconnected',
        error: err?.message || 'Database ping failed',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

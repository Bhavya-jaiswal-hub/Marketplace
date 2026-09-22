import { HttpStatus } from '@nestjs/common';
import { AppController } from '../src/app.controller';
import { PrismaService } from '../src/prisma.service';

describe('AppController', () => {
  let controller: AppController;
  let mockPrisma: any;
  let mockReply: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    controller = new AppController(mockPrisma as PrismaService);
  });

  it('returns ok status and database metrics when database is healthy', async () => {
    await controller.getHealth(mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'marketplace-backend',
        database: expect.objectContaining({
          status: 'healthy',
        }),
        memory: expect.objectContaining({
          rssMb: expect.any(Number),
          heapUsedMb: expect.any(Number),
        }),
      }),
    );
  });

  it('returns degraded status and 503 when database query fails', async () => {
    mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('DB Connection Timeout'));

    await controller.getHealth(mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        database: expect.objectContaining({
          status: 'unreachable',
        }),
      }),
    );
  });

  it('returns liveness ok status', () => {
    const liveness = controller.getLiveness();

    expect(liveness).toEqual(
      expect.objectContaining({
        status: 'ok',
        timestamp: expect.any(String),
      }),
    );
  });

  it('returns readiness ready when database is reachable', async () => {
    await controller.getReadiness(mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        database: 'connected',
      }),
    );
  });

  it('returns readiness not_ready with 503 when database is unreachable', async () => {
    mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));

    await controller.getReadiness(mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockReply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'not_ready',
        database: 'disconnected',
      }),
    );
  });
});

import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportingController],
  providers: [ReportingService, PrismaService],
  exports: [ReportingService],
})
export class ReportingModule {}

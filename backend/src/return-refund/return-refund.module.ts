import { Module } from '@nestjs/common';
import { ReturnRefundService } from './return-refund.service';
import { ReturnRefundController } from './return-refund.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [AuthModule, AuditModule, InventoryModule],
  controllers: [ReturnRefundController],
  providers: [ReturnRefundService, PrismaService],
  exports: [ReturnRefundService],
})
export class ReturnRefundModule {}

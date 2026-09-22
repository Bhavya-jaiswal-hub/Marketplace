import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, CustomerModule, InventoryModule, AuditModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

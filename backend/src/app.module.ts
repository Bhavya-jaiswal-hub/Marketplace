import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { SellerModule } from './seller/seller.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomerModule } from './customer/customer.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'auth',
        ttl: 900000, // 15 minutes
        limit: 10, // 10 requests per 15 minutes
      },
    ]),
    EmailModule,
    AuthModule,
    AuditModule,
    StorageModule,
    SellerModule,
    CategoryModule,
    ProductModule,
    InventoryModule,
    CustomerModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

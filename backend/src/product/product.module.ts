import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';

@Module({
  imports: [AuthModule, CategoryModule],
  controllers: [ProductController],
  providers: [ProductService, PrismaService],
  exports: [ProductService],
})
export class ProductModule {}

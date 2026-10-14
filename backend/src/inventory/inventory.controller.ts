import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InventoryService } from './inventory.service';
import {
  AdjustStockDto,
  ConfirmReservationDto,
  ReleaseReservationDto,
  ReserveStockDto,
  ValidateStockDto,
} from './dto';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ================= SELLER VARIANT INVENTORY OPERATIONS =================

  @Get('sellers/me/inventory')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getSellerInventory(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.inventoryService.getSellerInventory(req.user.sub);
  }

  @Get('sellers/me/variants/:variantId/inventory')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getVariantInventory(
    @Req() req: AuthenticatedRequest,
    @Param('variantId') variantId: string,
  ): Promise<any> {
    return this.inventoryService.getVariantInventory(req.user.sub, variantId);
  }

  @Patch('sellers/me/variants/:variantId/inventory')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async adjustVariantStock(
    @Req() req: AuthenticatedRequest,
    @Param('variantId') variantId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<any> {
    return this.inventoryService.adjustVariantStock(req.user.sub, variantId, dto);
  }

  @Get('sellers/me/variants/:variantId/inventory/history')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getVariantInventoryHistory(
    @Req() req: AuthenticatedRequest,
    @Param('variantId') variantId: string,
  ): Promise<any> {
    return this.inventoryService.getVariantInventoryHistory(req.user.sub, variantId);
  }

  @Get('sellers/me/products/:productId/inventory')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getProductInventory(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.inventoryService.getProductInventory(req.user.sub, productId);
  }

  @Patch('sellers/me/products/:productId/inventory')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async adjustStock(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<any> {
    return this.inventoryService.adjustStock(req.user.sub, productId, dto);
  }

  // ================= INTERNAL WORKFLOW INTERFACES =================

  @Post('inventory/validate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async validateStock(@Body() dto: ValidateStockDto): Promise<any> {
    return this.inventoryService.validateStock(dto);
  }

  @Post('inventory/reservations')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async reserveStock(@Body() dto: ReserveStockDto): Promise<any> {
    return this.inventoryService.reserveStock(dto);
  }

  @Post('inventory/reservations/confirm')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async confirmReservation(@Body() dto: ConfirmReservationDto): Promise<any> {
    return this.inventoryService.confirmReservation(dto);
  }

  @Post('inventory/reservations/release')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async releaseReservation(@Body() dto: ReleaseReservationDto): Promise<any> {
    return this.inventoryService.releaseReservation(dto);
  }
}

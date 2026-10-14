import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  DuplicateProductDto,
  ProductImageDto,
  ProductQueryDto,
  SetSpecificationsDto,
  UpdateProductDto,
  CreateProductVariantDto,
  UpdateProductVariantDto,
  AdminTakedownDto,
} from './dto';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // ================= PUBLIC MARKETPLACE BROWSING =================

  @Get('products')
  async listPublicProducts(@Query() query: ProductQueryDto): Promise<any> {
    return this.productService.listPublicProducts(query);
  }

  @Get('products/:productId')
  async getPublicProduct(@Param('productId') productId: string): Promise<any> {
    return this.productService.getPublicProduct(productId);
  }

  // ================= SELLER PRODUCT OPERATIONS =================

  @Get('sellers/me/products')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getOwnProducts(
    @Req() req: AuthenticatedRequest,
    @Query() query: ProductQueryDto,
  ): Promise<any> {
    return this.productService.getOwnProducts(req.user.sub, query);
  }

  @Post('sellers/me/products')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductDto,
  ): Promise<any> {
    return this.productService.createProduct(req.user.sub, dto);
  }

  @Get('sellers/me/products/:productId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getOwnProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getOwnProduct(req.user.sub, productId);
  }

  @Patch('sellers/me/products/:productId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async updateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<any> {
    return this.productService.updateProduct(req.user.sub, productId, dto);
  }

  @Post('sellers/me/products/:productId/duplicate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.CREATED)
  async duplicateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: DuplicateProductDto,
  ): Promise<any> {
    return this.productService.duplicateProduct(req.user.sub, productId, dto);
  }

  @Post('sellers/me/products/:productId/pause')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.OK)
  async pauseProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.pauseProduct(req.user.sub, productId);
  }

  @Post('sellers/me/products/:productId/activate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.OK)
  async activateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.activateProduct(req.user.sub, productId);
  }

  @Post('sellers/me/products/:productId/hide')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.OK)
  async hideProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.hideProduct(req.user.sub, productId);
  }

  @Delete('sellers/me/products/:productId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async deleteProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.deleteProduct(req.user.sub, productId);
  }

  // ================= IMAGES & SPECIFICATIONS =================

  @Get('sellers/me/products/:productId/images')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getProductImages(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getProductImages(req.user.sub, productId);
  }

  @Post('sellers/me/products/:productId/images')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.CREATED)
  async addProductImage(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: ProductImageDto,
  ): Promise<any> {
    return this.productService.addProductImage(req.user.sub, productId, dto);
  }

  @Delete('sellers/me/products/:productId/images/:imageId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async removeProductImage(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ): Promise<any> {
    return this.productService.removeProductImage(req.user.sub, productId, imageId);
  }

  @Get('sellers/me/products/:productId/specifications')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getProductSpecifications(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getProductSpecifications(req.user.sub, productId);
  }

  @Put('sellers/me/products/:productId/specifications')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async setProductSpecifications(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: SetSpecificationsDto,
  ): Promise<any> {
    return this.productService.setProductSpecifications(req.user.sub, productId, dto);
  }

  // ================= PRODUCT VARIANTS (SIZE X COLOR) =================

  @Post('sellers/me/products/:productId/variants')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  @HttpCode(HttpStatus.CREATED)
  async createProductVariant(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ): Promise<any> {
    return this.productService.createProductVariant(req.user.sub, productId, dto);
  }

  @Get('sellers/me/products/:productId/variants')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async getProductVariants(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getProductVariants(req.user.sub, productId);
  }

  @Patch('sellers/me/products/:productId/variants/:variantId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async updateProductVariant(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ): Promise<any> {
    return this.productService.updateProductVariant(req.user.sub, productId, variantId, dto);
  }

  @Delete('sellers/me/products/:productId/variants/:variantId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SELLER')
  async deleteProductVariant(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ): Promise<any> {
    return this.productService.deleteProductVariant(req.user.sub, productId, variantId);
  }

  // ================= ADMIN PRODUCT MODERATION TAKEDOWN =================

  @Post('admin/products/:productId/takedown')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async takedownProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: AdminTakedownDto,
  ): Promise<any> {
    return this.productService.takedownProduct(req.user.sub, productId, dto);
  }
}

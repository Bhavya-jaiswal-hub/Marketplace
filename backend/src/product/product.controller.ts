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
import { ProductService } from './product.service';
import {
  CreateProductDto,
  DuplicateProductDto,
  ProductImageDto,
  ProductQueryDto,
  SetSpecificationsDto,
  UpdateProductDto,
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
  async getOwnProducts(
    @Req() req: AuthenticatedRequest,
    @Query() query: ProductQueryDto,
  ): Promise<any> {
    return this.productService.getOwnProducts(req.user.sub, query);
  }

  @Post('sellers/me/products')
  @UseGuards(AuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async createProduct(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProductDto,
  ): Promise<any> {
    return this.productService.createProduct(req.user.sub, dto);
  }

  @Get('sellers/me/products/:productId')
  @UseGuards(AuthGuard, RolesGuard)
  async getOwnProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getOwnProduct(req.user.sub, productId);
  }

  @Patch('sellers/me/products/:productId')
  @UseGuards(AuthGuard, RolesGuard)
  async updateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<any> {
    return this.productService.updateProduct(req.user.sub, productId, dto);
  }

  @Post('sellers/me/products/:productId/duplicate')
  @UseGuards(AuthGuard, RolesGuard)
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
  @HttpCode(HttpStatus.OK)
  async pauseProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.pauseProduct(req.user.sub, productId);
  }

  @Post('sellers/me/products/:productId/activate')
  @UseGuards(AuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  async activateProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.activateProduct(req.user.sub, productId);
  }

  @Post('sellers/me/products/:productId/hide')
  @UseGuards(AuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  async hideProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.hideProduct(req.user.sub, productId);
  }

  @Delete('sellers/me/products/:productId')
  @UseGuards(AuthGuard, RolesGuard)
  async deleteProduct(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.deleteProduct(req.user.sub, productId);
  }

  // ================= IMAGES & SPECIFICATIONS =================

  @Get('sellers/me/products/:productId/images')
  @UseGuards(AuthGuard, RolesGuard)
  async getProductImages(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getProductImages(req.user.sub, productId);
  }

  @Post('sellers/me/products/:productId/images')
  @UseGuards(AuthGuard, RolesGuard)
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
  async removeProductImage(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ): Promise<any> {
    return this.productService.removeProductImage(req.user.sub, productId, imageId);
  }

  @Get('sellers/me/products/:productId/specifications')
  @UseGuards(AuthGuard, RolesGuard)
  async getProductSpecifications(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ): Promise<any> {
    return this.productService.getProductSpecifications(req.user.sub, productId);
  }

  @Put('sellers/me/products/:productId/specifications')
  @UseGuards(AuthGuard, RolesGuard)
  async setProductSpecifications(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: SetSpecificationsDto,
  ): Promise<any> {
    return this.productService.setProductSpecifications(req.user.sub, productId, dto);
  }
}

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
import { CategoryService } from './category.service';
import {
  AssignCategoryDto,
  CategoryRequestDto,
  CategoryRequestQueryDto,
  ConfigureCommissionDto,
  CreateCategoryDto,
  RejectCategoryRequestDto,
  RevokeCategoryDto,
  UpdateCategoryDto,
} from './dto';

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ================= PUBLIC CATEGORY BROWSING =================

  @Get('categories')
  async listCategories(): Promise<any> {
    return this.categoryService.listCategories(true);
  }

  @Get('categories/:categoryId')
  async getCategoryById(@Param('categoryId') categoryId: string): Promise<any> {
    return this.categoryService.getCategoryById(categoryId);
  }

  // ================= SELLER CATEGORY WORKFLOWS =================

  @Get('sellers/me/categories/available')
  @UseGuards(AuthGuard, RolesGuard)
  async getAvailableCategories(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.categoryService.getAvailableCategories(req.user.sub);
  }

  @Post('sellers/me/category-requests')
  @UseGuards(AuthGuard, RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  async requestCategories(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CategoryRequestDto,
  ): Promise<any> {
    return this.categoryService.requestCategories(req.user.sub, dto);
  }

  @Get('sellers/me/category-requests')
  @UseGuards(AuthGuard, RolesGuard)
  async getOwnCategoryRequests(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.categoryService.getOwnCategoryRequests(req.user.sub);
  }

  @Get('sellers/me/categories')
  @UseGuards(AuthGuard, RolesGuard)
  async getOwnApprovedCategories(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.categoryService.getOwnApprovedCategories(req.user.sub);
  }

  // ================= SUPER ADMIN CATEGORY MANAGEMENT =================

  @Post('admin/categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCategoryDto,
  ): Promise<any> {
    return this.categoryService.createCategory(req.user.sub, dto);
  }

  @Patch('admin/categories/:categoryId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateCategory(
    @Req() req: AuthenticatedRequest,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<any> {
    return this.categoryService.updateCategory(req.user.sub, categoryId, dto);
  }

  @Delete('admin/categories/:categoryId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deactivateCategory(
    @Req() req: AuthenticatedRequest,
    @Param('categoryId') categoryId: string,
  ): Promise<any> {
    return this.categoryService.deactivateCategory(req.user.sub, categoryId);
  }

  // ================= SUPER ADMIN COMMISSION CONFIGURATION =================

  @Get('admin/categories/:categoryId/commission')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getCommission(@Param('categoryId') categoryId: string): Promise<any> {
    return this.categoryService.getCommission(categoryId);
  }

  @Put('admin/categories/:categoryId/commission')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async configureCommission(
    @Req() req: AuthenticatedRequest,
    @Param('categoryId') categoryId: string,
    @Body() dto: ConfigureCommissionDto,
  ): Promise<any> {
    return this.categoryService.configureCommission(req.user.sub, categoryId, dto);
  }

  // ================= SUPER ADMIN SELLER CATEGORY REVIEWS =================

  @Get('admin/category-requests')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async listAdminCategoryRequests(@Query() query: CategoryRequestQueryDto): Promise<any> {
    return this.categoryService.listAdminCategoryRequests(query);
  }

  @Get('admin/category-requests/:requestId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getCategoryRequest(@Param('requestId') requestId: string): Promise<any> {
    return this.categoryService.getCategoryRequest(requestId);
  }

  @Post('admin/category-requests/:requestId/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async approveCategoryRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ): Promise<any> {
    return this.categoryService.approveCategoryRequest(req.user.sub, requestId);
  }

  @Post('admin/category-requests/:requestId/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async rejectCategoryRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() dto: RejectCategoryRequestDto,
  ): Promise<any> {
    return this.categoryService.rejectCategoryRequest(req.user.sub, requestId, dto);
  }

  @Delete('admin/sellers/:sellerId/categories/:categoryId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async revokeSellerCategory(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: RevokeCategoryDto,
  ): Promise<any> {
    return this.categoryService.revokeSellerCategory(req.user.sub, sellerId, categoryId, dto);
  }

  @Get('admin/sellers/:sellerId/categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getSellerCategories(@Param('sellerId') sellerId: string): Promise<any> {
    return this.categoryService.getSellerCategories(sellerId);
  }

  @Post('admin/sellers/:sellerId/categories')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async assignCategoryToSeller(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
    @Body() dto: AssignCategoryDto,
  ): Promise<any> {
    return this.categoryService.assignCategoryToSeller(req.user.sub, sellerId, dto);
  }
}

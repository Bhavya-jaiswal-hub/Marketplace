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
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SellerService } from './seller.service';
import {
  ApproveSellerDto,
  CreateSellerAddressDto,
  CreateSellerProfileDto,
  RejectSellerDto,
  SellerQueryDto,
  SubmitDocumentDto,
  UpdateSellerAddressDto,
  UpdateSellerProfileDto,
  UpdateSellerStatusDto,
} from './dto';
import { FastifyReply } from 'fastify';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  // ================= SELLER ONBOARDING & PROFILE =================

  @Post('sellers')
  @HttpCode(HttpStatus.CREATED)
  async createSellerProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSellerProfileDto,
  ): Promise<any> {
    return this.sellerService.createSellerProfile(req.user.sub, dto);
  }

  @Get('sellers/me')
  async getOwnProfile(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.sellerService.getOwnProfile(req.user.sub);
  }

  @Patch('sellers/me')
  async updateOwnProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateSellerProfileDto,
  ): Promise<any> {
    return this.sellerService.updateOwnProfile(req.user.sub, dto);
  }

  @Get('sellers/me/status')
  async getStatus(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.sellerService.getStatus(req.user.sub);
  }

  @Post('sellers/me/verification/resubmit')
  @HttpCode(HttpStatus.OK)
  async resubmitVerification(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.sellerService.resubmitVerification(req.user.sub);
  }

  // ================= SELLER ADDRESSES =================

  @Get('sellers/me/addresses')
  async getAddresses(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.sellerService.getAddresses(req.user.sub);
  }

  @Post('sellers/me/addresses')
  @HttpCode(HttpStatus.CREATED)
  async addAddress(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSellerAddressDto,
  ): Promise<any> {
    return this.sellerService.addAddress(req.user.sub, dto);
  }

  @Get('sellers/me/addresses/:addressId')
  async getAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ): Promise<any> {
    return this.sellerService.getAddress(req.user.sub, addressId);
  }

  @Patch('sellers/me/addresses/:addressId')
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateSellerAddressDto,
  ): Promise<any> {
    return this.sellerService.updateAddress(req.user.sub, addressId, dto);
  }

  @Delete('sellers/me/addresses/:addressId')
  async deleteAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ): Promise<any> {
    return this.sellerService.deleteAddress(req.user.sub, addressId);
  }

  // ================= SELLER DOCUMENTS =================

  @Get('sellers/me/documents')
  async getOwnDocuments(@Req() req: AuthenticatedRequest): Promise<any> {
    return this.sellerService.getOwnDocuments(req.user.sub);
  }

  @Post('sellers/me/documents')
  @HttpCode(HttpStatus.CREATED)
  async submitDocument(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SubmitDocumentDto,
  ): Promise<any> {
    return this.sellerService.submitDocument(req.user.sub, dto);
  }

  // ================= SUPER ADMIN OPERATIONS =================

  @Get('admin/sellers')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async listSellers(@Query() query: SellerQueryDto): Promise<any> {
    return this.sellerService.listSellers(query);
  }

  @Get('admin/sellers/:sellerId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getSellerDetails(@Param('sellerId') sellerId: string): Promise<any> {
    return this.sellerService.getSellerDetails(sellerId);
  }

  @Post('admin/sellers/:sellerId/approve')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async approveSeller(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
    @Body() dto: ApproveSellerDto,
  ): Promise<any> {
    return this.sellerService.approveSeller(req.user.sub, sellerId, dto);
  }

  @Post('admin/sellers/:sellerId/reject')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async rejectSeller(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
    @Body() dto: RejectSellerDto,
  ): Promise<any> {
    return this.sellerService.rejectSeller(req.user.sub, sellerId, dto);
  }

  @Patch('admin/sellers/:sellerId/status')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateSellerStatus(
    @Req() req: AuthenticatedRequest,
    @Param('sellerId') sellerId: string,
    @Body() dto: UpdateSellerStatusDto,
  ): Promise<any> {
    return this.sellerService.updateSellerStatus(req.user.sub, sellerId, dto);
  }

  @Get('admin/sellers/:sellerId/documents/:documentId/download')
  @Roles('SUPER_ADMIN', 'ADMIN')
  async downloadDocument(
    @Req() req: AuthenticatedRequest & { ip?: string; headers: Record<string, string> },
    @Res() res: FastifyReply,
    @Param('sellerId') sellerId: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const file = await this.sellerService.downloadDocument(
      req.user.sub,
      sellerId,
      documentId,
      ipAddress,
      userAgent,
    );

    res.header('Content-Type', file.mimeType);
    res.header('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.send(file.buffer);
  }
}

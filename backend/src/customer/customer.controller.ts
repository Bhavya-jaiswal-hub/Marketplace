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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CustomerService } from './customer.service';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from './dto';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.customerService.getOrCreateProfile(req.user.sub);
  }

  @Patch('me')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customerService.updateProfile(req.user.sub, dto);
  }

  @Get('me/addresses')
  async listAddresses(@Req() req: AuthenticatedRequest) {
    return this.customerService.listAddresses(req.user.sub);
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customerService.createAddress(req.user.sub, dto);
  }

  @Get('me/addresses/:addressId')
  async getAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ) {
    return this.customerService.getAddress(req.user.sub, addressId);
  }

  @Patch('me/addresses/:addressId')
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customerService.updateAddress(req.user.sub, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  async deleteAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
  ) {
    return this.customerService.deleteAddress(req.user.sub, addressId);
  }
}

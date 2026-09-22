import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCustomerAddressDto,
  UpdateCustomerAddressDto,
  UpdateCustomerProfileDto,
} from './dto';

@Injectable()
export class CustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getOrCreateProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.customerProfile) {
      return {
        success: true,
        data: user.customerProfile,
      };
    }

    // Initialize customer profile from User data
    const nameParts = user.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const profile = await this.prisma.customerProfile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phoneNumber: user.mobileNumber || null,
      },
    });

    await this.audit.logAction({
      userId: user.id,
      action: 'CUSTOMER_PROFILE_INITIALIZED',
      resourceType: 'CustomerProfile',
      resourceId: profile.id,
      newValue: profile,
    });

    return {
      success: true,
      data: profile,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const profileRes = await this.getOrCreateProfile(userId);
    const profileId = profileRes.data.id;

    const previousValue = profileRes.data;

    const updated = await this.prisma.customerProfile.update({
      where: { id: profileId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
      },
    });

    await this.audit.logAction({
      userId,
      action: 'CUSTOMER_PROFILE_UPDATED',
      resourceType: 'CustomerProfile',
      resourceId: profileId,
      previousValue,
      newValue: updated,
    });

    return {
      success: true,
      data: updated,
      message: 'Customer profile updated successfully',
    };
  }

  async listAddresses(userId: string) {
    const profileRes = await this.getOrCreateProfile(userId);
    const customerId = profileRes.data.id;

    const addresses = await this.prisma.customerAddress.findMany({
      where: {
        customerId,
        isActive: true,
      },
      orderBy: [
        { isDefaultShipping: 'desc' },
        { isDefaultBilling: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return {
      success: true,
      data: addresses,
    };
  }

  async getAddress(userId: string, addressId: string) {
    const profileRes = await this.getOrCreateProfile(userId);
    const customerId = profileRes.data.id;

    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
        isActive: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return {
      success: true,
      data: address,
    };
  }

  async createAddress(userId: string, dto: CreateCustomerAddressDto) {
    const profileRes = await this.getOrCreateProfile(userId);
    const customerId = profileRes.data.id;

    const activeAddressCount = await this.prisma.customerAddress.count({
      where: {
        customerId,
        isActive: true,
      },
    });

    const isFirstAddress = activeAddressCount === 0;
    const isDefaultShipping = dto.isDefaultShipping ?? isFirstAddress;
    const isDefaultBilling = dto.isDefaultBilling ?? isFirstAddress;

    if (isDefaultShipping) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isActive: true },
        data: { isDefaultShipping: false },
      });
    }

    if (isDefaultBilling) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isActive: true },
        data: { isDefaultBilling: false },
      });
    }

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 || null,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'India',
        addressType: dto.addressType,
        isDefaultShipping,
        isDefaultBilling,
        isActive: true,
      },
    });

    await this.audit.logAction({
      userId,
      action: 'CUSTOMER_ADDRESS_CREATED',
      resourceType: 'CustomerAddress',
      resourceId: address.id,
      newValue: address,
    });

    return {
      success: true,
      data: address,
      message: 'Address created successfully',
    };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    const profileRes = await this.getOrCreateProfile(userId);
    const customerId = profileRes.data.id;

    const existingAddress = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
        isActive: true,
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefaultShipping === true) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isActive: true, id: { not: addressId } },
        data: { isDefaultShipping: false },
      });
    }

    if (dto.isDefaultBilling === true) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isActive: true, id: { not: addressId } },
        data: { isDefaultBilling: false },
      });
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
        ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.addressType !== undefined && { addressType: dto.addressType }),
        ...(dto.isDefaultShipping !== undefined && {
          isDefaultShipping: dto.isDefaultShipping,
        }),
        ...(dto.isDefaultBilling !== undefined && {
          isDefaultBilling: dto.isDefaultBilling,
        }),
      },
    });

    await this.audit.logAction({
      userId,
      action: 'CUSTOMER_ADDRESS_UPDATED',
      resourceType: 'CustomerAddress',
      resourceId: addressId,
      previousValue: existingAddress,
      newValue: updated,
    });

    return {
      success: true,
      data: updated,
      message: 'Address updated successfully',
    };
  }

  async deleteAddress(userId: string, addressId: string) {
    const profileRes = await this.getOrCreateProfile(userId);
    const customerId = profileRes.data.id;

    const existingAddress = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
        isActive: true,
      },
    });

    if (!existingAddress) {
      throw new NotFoundException('Address not found');
    }

    // Soft deactivation to protect past order historical references
    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        isActive: false,
        isDefaultShipping: false,
        isDefaultBilling: false,
      },
    });

    await this.audit.logAction({
      userId,
      action: 'CUSTOMER_ADDRESS_DEACTIVATED',
      resourceType: 'CustomerAddress',
      resourceId: addressId,
      previousValue: existingAddress,
    });

    return {
      success: true,
      message: 'Address deactivated successfully',
    };
  }
}

import { NotFoundException } from '@nestjs/common';
import { CustomerService } from '../src/customer/customer.service';
import { CustomerAddressType } from '@prisma/client';

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: any;
  let audit: any;

  const mockUser = {
    id: 'user-cust-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    mobileNumber: '9876543210',
    customerProfile: null,
  };

  const mockProfile = {
    id: 'prof-1',
    userId: 'user-cust-1',
    firstName: 'Jane',
    lastName: 'Doe',
    phoneNumber: '9876543210',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      customerProfile: {
        create: jest.fn(),
        update: jest.fn(),
      },
      customerAddress: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
    };

    audit = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };

    service = new CustomerService(prisma, audit);
  });

  describe('getOrCreateProfile', () => {
    it('should return existing customer profile if it exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        customerProfile: mockProfile,
      });

      const res = await service.getOrCreateProfile('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.id).toBe('prof-1');
      expect(prisma.customerProfile.create).not.toHaveBeenCalled();
    });

    it('should create and return customer profile if one does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        customerProfile: null,
      });
      prisma.customerProfile.create.mockResolvedValue(mockProfile);

      const res = await service.getOrCreateProfile('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data.firstName).toBe('Jane');
      expect(prisma.customerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-cust-1',
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: '9876543210',
        },
      });
    });

    it('should throw NotFoundException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getOrCreateProfile('user-not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update customer profile fields and log audit', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        customerProfile: mockProfile,
      });
      const updatedProfile = { ...mockProfile, firstName: 'Janet' };
      prisma.customerProfile.update.mockResolvedValue(updatedProfile);

      const res = await service.updateProfile('user-cust-1', {
        firstName: 'Janet',
      });

      expect(res.success).toBe(true);
      expect(res.data.firstName).toBe('Janet');
      expect(prisma.customerProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof-1' },
        data: { firstName: 'Janet' },
      });
      expect(audit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_PROFILE_UPDATED',
          resourceType: 'CustomerProfile',
          resourceId: 'prof-1',
        }),
      );
    });
  });

  describe('Address Management', () => {
    const mockAddress = {
      id: 'addr-1',
      customerId: 'prof-1',
      fullName: 'Jane Doe',
      phoneNumber: '9876543210',
      addressLine1: '123 MG Road',
      addressLine2: 'Apt 4B',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
      addressType: CustomerAddressType.HOME,
      isDefaultShipping: true,
      isDefaultBilling: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        customerProfile: mockProfile,
      });
    });

    it('should create first address as default shipping and billing', async () => {
      prisma.customerAddress.count.mockResolvedValue(0);
      prisma.customerAddress.create.mockResolvedValue(mockAddress);

      const res = await service.createAddress('user-cust-1', {
        fullName: 'Jane Doe',
        phoneNumber: '9876543210',
        addressLine1: '123 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
      });

      expect(res.success).toBe(true);
      expect(prisma.customerAddress.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 'prof-1',
          postalCode: '560001',
          isDefaultShipping: true,
          isDefaultBilling: true,
          isActive: true,
        }),
      });
    });

    it('should unset existing default flags when new default is created', async () => {
      prisma.customerAddress.count.mockResolvedValue(1);
      prisma.customerAddress.updateMany.mockResolvedValue({ count: 1 });
      prisma.customerAddress.create.mockResolvedValue({
        ...mockAddress,
        id: 'addr-2',
        addressLine1: '456 Brigade Road',
      });

      const res = await service.createAddress('user-cust-1', {
        fullName: 'Jane Doe',
        phoneNumber: '9876543210',
        addressLine1: '456 Brigade Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560025',
        isDefaultShipping: true,
      });

      expect(res.success).toBe(true);
      expect(prisma.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'prof-1', isActive: true },
        data: { isDefaultShipping: false },
      });
    });

    it('should list only active addresses for the customer', async () => {
      prisma.customerAddress.findMany.mockResolvedValue([mockAddress]);

      const res = await service.listAddresses('user-cust-1');
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(prisma.customerAddress.findMany).toHaveBeenCalledWith({
        where: { customerId: 'prof-1', isActive: true },
        orderBy: [
          { isDefaultShipping: 'desc' },
          { isDefaultBilling: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    });

    it('should throw NotFoundException if address does not exist or is inactive', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(null);

      await expect(
        service.getAddress('user-cust-1', 'invalid-addr'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should soft-deactivate address on delete', async () => {
      prisma.customerAddress.findFirst.mockResolvedValue(mockAddress);
      prisma.customerAddress.update.mockResolvedValue({
        ...mockAddress,
        isActive: false,
      });

      const res = await service.deleteAddress('user-cust-1', 'addr-1');
      expect(res.success).toBe(true);
      expect(prisma.customerAddress.update).toHaveBeenCalledWith({
        where: { id: 'addr-1' },
        data: {
          isActive: false,
          isDefaultShipping: false,
          isDefaultBilling: false,
        },
      });
      expect(audit.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CUSTOMER_ADDRESS_DEACTIVATED',
          resourceType: 'CustomerAddress',
          resourceId: 'addr-1',
        }),
      );
    });
  });
});

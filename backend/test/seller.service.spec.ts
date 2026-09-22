import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SellerService } from '../src/seller/seller.service';
import { PrismaService } from '../src/prisma.service';
import { AuditService } from '../src/audit/audit.service';
import { StorageService } from '../src/storage/storage.service';
import { AddressType, DocumentType, SellerStatus, SellerType, VerificationStatus } from '@prisma/client';

describe('SellerService', () => {
  let service: SellerService;
  let prisma: any;
  let auditService: { logAction: jest.Mock; getResourceAuditLogs: jest.Mock };
  let storageService: {
    uploadVerificationDocument: jest.Mock;
    getFileBuffer: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sellerVerification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      verificationDocument: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      sellerAddress: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    auditService = {
      logAction: jest.fn().mockResolvedValue({ id: 'audit-log-id' }),
      getResourceAuditLogs: jest.fn().mockResolvedValue([]),
    };

    storageService = {
      uploadVerificationDocument: jest.fn().mockResolvedValue({
        fileKey: 'sellers/seller-1/verifications/1/file.pdf',
        fileName: 'pan.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      }),
      getFileBuffer: jest.fn().mockResolvedValue({
        buffer: Buffer.from('Mock file data'),
      }),
    };

    service = new SellerService(
      prisma as unknown as PrismaService,
      auditService as unknown as AuditService,
      storageService as unknown as StorageService,
    );
  });

  describe('Seller Onboarding', () => {
    it('creates an individual seller profile and initial pending verification', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      prisma.sellerProfile.create.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        sellerType: SellerType.INDIVIDUAL,
        displayName: 'John Store',
        businessName: null,
        status: SellerStatus.PENDING,
      });
      prisma.sellerVerification.create.mockResolvedValue({
        id: 'ver-1',
        sellerId: 'seller-1',
        submissionNumber: 1,
        status: VerificationStatus.PENDING,
      });

      const res = await service.createSellerProfile('user-1', {
        sellerType: SellerType.INDIVIDUAL,
        displayName: 'John Store',
        contactEmail: 'john@example.com',
      });

      expect(res.success).toBe(true);
      expect(res.data.seller.status).toBe(SellerStatus.PENDING);
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SELLER_ONBOARDING_CREATED' }),
      );
    });

    it('requires businessName when sellerType is BUSINESS', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.createSellerProfile('user-1', {
          sellerType: SellerType.BUSINESS,
          displayName: 'Enterprise Store',
          businessName: ' ',
          contactEmail: 'corp@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate seller profile creation for the same user with 409 Conflict', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'existing-seller-1' });

      await expect(
        service.createSellerProfile('user-1', {
          sellerType: SellerType.INDIVIDUAL,
          displayName: 'Duplicate Store',
          contactEmail: 'dup@example.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Address Management', () => {
    it('adds first address as primary automatically', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.sellerAddress.count.mockResolvedValue(0);
      prisma.sellerAddress.create.mockResolvedValue({
        id: 'addr-1',
        sellerId: 'seller-1',
        isPrimary: true,
      });

      const res = await service.addAddress('user-1', {
        addressType: AddressType.PICKUP,
        addressLine1: 'Plot 42, Sector 5',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201301',
      });

      expect(res.data.address.isPrimary).toBe(true);
      expect(prisma.sellerAddress.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPrimary: true }),
        }),
      );
    });

    it('enforces address ownership on retrieval and deletion', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({ id: 'seller-1', userId: 'user-1' });
      prisma.sellerAddress.findUnique.mockResolvedValue({ id: 'addr-99', sellerId: 'seller-other' });

      await expect(service.getAddress('user-1', 'addr-99')).rejects.toThrow(ForbiddenException);
      await expect(service.deleteAddress('user-1', 'addr-99')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Document Submission & Verification', () => {
    it('submits a KYC document and attaches to pending verification', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.PENDING,
        verifications: [{ id: 'ver-1', submissionNumber: 1, status: VerificationStatus.PENDING }],
      });
      prisma.verificationDocument.create.mockResolvedValue({
        id: 'doc-1',
        verificationId: 'ver-1',
        documentType: DocumentType.PAN,
        fileName: 'pan.pdf',
        fileSize: 1024,
        status: 'PENDING',
        uploadedAt: new Date(),
      });

      const res = await service.submitDocument('user-1', {
        documentType: DocumentType.PAN,
        fileName: 'pan.pdf',
        mimeType: 'application/pdf',
        fileBase64: Buffer.from('mock content').toString('base64'),
      });

      expect(res.success).toBe(true);
      expect(res.data.document.id).toBe('doc-1');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DOCUMENT_SUBMITTED' }),
      );
    });

    it('prevents blocked sellers from submitting documents', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.BLOCKED,
        verifications: [],
      });

      await expect(
        service.submitDocument('user-1', {
          documentType: DocumentType.AADHAAR,
          fileName: 'aadhaar.pdf',
          mimeType: 'application/pdf',
          fileBase64: Buffer.from('mock content').toString('base64'),
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows rejected sellers to resubmit verification with incremental submission number', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.REJECTED,
        verifications: [{ id: 'ver-1', submissionNumber: 1, status: VerificationStatus.REJECTED }],
      });
      prisma.sellerVerification.create.mockResolvedValue({
        id: 'ver-2',
        sellerId: 'seller-1',
        submissionNumber: 2,
        status: VerificationStatus.PENDING,
      });

      const res = await service.resubmitVerification('user-1');
      expect(res.data.submissionNumber).toBe(2);
      expect(res.data.status).toBe(VerificationStatus.PENDING);
      expect(prisma.sellerProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: SellerStatus.PENDING } }),
      );
    });
  });

  describe('Super Admin Verification Decisions', () => {
    it('approves seller verification only when address and documents exist', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.PENDING,
        addresses: [{ id: 'addr-1' }],
        verifications: [
          {
            id: 'ver-1',
            status: VerificationStatus.PENDING,
            verificationDocuments: [{ id: 'doc-1' }],
          },
        ],
      });

      const res = await service.approveSeller('admin-1', 'seller-1', { notes: 'All documents verified' });
      expect(res.success).toBe(true);
      expect(res.data.status).toBe(SellerStatus.APPROVED);
      expect(prisma.sellerVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VerificationStatus.APPROVED,
            reviewedById: 'admin-1',
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { accountStatus: 'ACTIVE' },
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SELLER_APPROVED' }),
      );
    });

    it('rejects seller verification with mandatory reason', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        id: 'seller-1',
        userId: 'user-1',
        status: SellerStatus.PENDING,
        verifications: [{ id: 'ver-1', status: VerificationStatus.PENDING }],
      });

      const res = await service.rejectSeller('admin-1', 'seller-1', {
        rejectionReason: 'Blurry PAN card document',
      });

      expect(res.success).toBe(true);
      expect(res.data.status).toBe(SellerStatus.REJECTED);
      expect(prisma.sellerVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: VerificationStatus.REJECTED,
            rejectionReason: 'Blurry PAN card document',
          }),
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SELLER_REJECTED' }),
      );
    });

    it('downloads document and records an audit log for security compliance', async () => {
      prisma.verificationDocument.findUnique.mockResolvedValue({
        id: 'doc-1',
        fileKey: 'sellers/seller-1/verifications/1/pan.pdf',
        fileName: 'pan.pdf',
        mimeType: 'application/pdf',
        documentType: DocumentType.PAN,
        verification: { sellerId: 'seller-1' },
      });

      const file = await service.downloadDocument(
        'admin-1',
        'seller-1',
        'doc-1',
        '127.0.0.1',
        'Mozilla/5.0 Admin',
      );

      expect(file.fileName).toBe('pan.pdf');
      expect(file.buffer.toString()).toBe('Mock file data');
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DOWNLOAD_SELLER_DOCUMENT',
          resourceType: 'VerificationDocument',
          resourceId: 'doc-1',
          userId: 'admin-1',
        }),
      );
    });
  });
});

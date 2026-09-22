import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
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
import {
  AccountStatus,
  Prisma,
  SellerStatus,
  SellerType,
  VerificationStatus,
} from '@prisma/client';

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}

  async createSellerProfile(userId: string, dto: CreateSellerProfileDto): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingProfile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (existingProfile) {
      throw new ConflictException('Seller profile already exists for this user');
    }

    if (dto.sellerType === SellerType.BUSINESS && !dto.businessName?.trim()) {
      throw new BadRequestException('Business name is required for Business sellers');
    }

    const seller = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.sellerProfile.create({
        data: {
          userId,
          sellerType: dto.sellerType,
          businessName: dto.businessName?.trim() || null,
          displayName: dto.displayName.trim(),
          businessDescription: dto.businessDescription?.trim() || null,
          contactEmail: dto.contactEmail.trim().toLowerCase(),
          contactMobile: dto.contactMobile?.trim() || null,
          status: SellerStatus.PENDING,
        },
      });

      const verification = await tx.sellerVerification.create({
        data: {
          sellerId: profile.id,
          submissionNumber: 1,
          status: VerificationStatus.PENDING,
        },
      });

      return { profile, verification };
    });

    await this.auditService.logAction({
      userId,
      action: 'SELLER_ONBOARDING_CREATED',
      resourceType: 'SellerProfile',
      resourceId: seller.profile.id,
      newValue: {
        sellerType: seller.profile.sellerType,
        displayName: seller.profile.displayName,
        status: seller.profile.status,
      },
    });

    return {
      success: true,
      data: {
        seller: {
          id: seller.profile.id,
          userId: seller.profile.userId,
          sellerType: seller.profile.sellerType,
          displayName: seller.profile.displayName,
          businessName: seller.profile.businessName,
          status: seller.profile.status,
          verificationId: seller.verification.id,
        },
      },
      message: 'Seller onboarding created successfully',
    };
  }

  async getOwnProfile(userId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        addresses: true,
        verifications: {
          orderBy: { submissionNumber: 'desc' },
          take: 1,
          include: {
            verificationDocuments: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const latestVerification = profile.verifications[0] || null;

    return {
      success: true,
      data: {
        seller: {
          id: profile.id,
          userId: profile.userId,
          sellerType: profile.sellerType,
          displayName: profile.displayName,
          businessName: profile.businessName,
          businessDescription: profile.businessDescription,
          contactEmail: profile.contactEmail,
          contactMobile: profile.contactMobile,
          status: profile.status,
          payoutDetails: profile.payoutDetails,
          addresses: profile.addresses,
          verification: latestVerification
            ? {
                id: latestVerification.id,
                submissionNumber: latestVerification.submissionNumber,
                status: latestVerification.status,
                submittedAt: latestVerification.submittedAt,
                reviewedAt: latestVerification.reviewedAt,
                rejectionReason: latestVerification.rejectionReason,
                documents: latestVerification.verificationDocuments,
              }
            : null,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      },
      message: 'Seller profile retrieved successfully',
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateSellerProfileDto): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    if (profile.status === SellerStatus.BLOCKED) {
      throw new ForbiddenException('Blocked seller accounts cannot modify profile');
    }

    const previousValue = {
      displayName: profile.displayName,
      businessName: profile.businessName,
      contactEmail: profile.contactEmail,
      contactMobile: profile.contactMobile,
      payoutDetails: profile.payoutDetails,
    };

    const updated = await this.prisma.sellerProfile.update({
      where: { userId },
      data: {
        displayName: dto.displayName?.trim() ?? profile.displayName,
        businessName: dto.businessName !== undefined ? dto.businessName?.trim() : profile.businessName,
        businessDescription:
          dto.businessDescription !== undefined ? dto.businessDescription?.trim() : profile.businessDescription,
        contactEmail: dto.contactEmail?.trim().toLowerCase() ?? profile.contactEmail,
        contactMobile: dto.contactMobile !== undefined ? dto.contactMobile?.trim() : profile.contactMobile,
        payoutDetails: dto.payoutDetails !== undefined ? (dto.payoutDetails as any) : profile.payoutDetails,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'SELLER_PROFILE_UPDATED',
      resourceType: 'SellerProfile',
      resourceId: updated.id,
      previousValue,
      newValue: {
        displayName: updated.displayName,
        businessName: updated.businessName,
        contactEmail: updated.contactEmail,
        contactMobile: updated.contactMobile,
        payoutDetails: updated.payoutDetails,
      },
    });

    return {
      success: true,
      data: {
        seller: {
          id: updated.id,
          displayName: updated.displayName,
          businessName: updated.businessName,
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
      },
      message: 'Seller profile updated successfully',
    };
  }

  async getAddresses(userId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const addresses = await this.prisma.sellerAddress.findMany({
      where: { sellerId: profile.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      success: true,
      data: { addresses },
      message: 'Seller addresses retrieved successfully',
    };
  }

  async addAddress(userId: string, dto: CreateSellerAddressDto): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const existingCount = await this.prisma.sellerAddress.count({ where: { sellerId: profile.id } });
    const isPrimary = existingCount === 0 || dto.isPrimary === true;

    const address = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.sellerAddress.updateMany({
          where: { sellerId: profile.id },
          data: { isPrimary: false },
        });
      }

      return tx.sellerAddress.create({
        data: {
          sellerId: profile.id,
          addressType: dto.addressType,
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() || null,
          city: dto.city.trim(),
          state: dto.state.trim(),
          postalCode: dto.postalCode.trim(),
          country: dto.country?.trim() || 'IN',
          isPrimary,
        },
      });
    });

    await this.auditService.logAction({
      userId,
      action: 'SELLER_ADDRESS_ADDED',
      resourceType: 'SellerAddress',
      resourceId: address.id,
      newValue: address,
    });

    return {
      success: true,
      data: { address },
      message: 'Seller address created successfully',
    };
  }

  async getAddress(userId: string, addressId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const address = await this.prisma.sellerAddress.findUnique({ where: { id: addressId } });
    if (!address) {
      throw new NotFoundException('Seller address not found');
    }

    if (address.sellerId !== profile.id) {
      throw new ForbiddenException('You are not authorized to access this address');
    }

    return {
      success: true,
      data: { address },
      message: 'Seller address retrieved successfully',
    };
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateSellerAddressDto): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const existing = await this.prisma.sellerAddress.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException('Seller address not found');
    }

    if (existing.sellerId !== profile.id) {
      throw new ForbiddenException('You are not authorized to modify this address');
    }

    const address = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true) {
        await tx.sellerAddress.updateMany({
          where: { sellerId: profile.id, id: { not: addressId } },
          data: { isPrimary: false },
        });
      }

      return tx.sellerAddress.update({
        where: { id: addressId },
        data: {
          addressType: dto.addressType ?? existing.addressType,
          addressLine1: dto.addressLine1?.trim() ?? existing.addressLine1,
          addressLine2: dto.addressLine2 !== undefined ? dto.addressLine2?.trim() : existing.addressLine2,
          city: dto.city?.trim() ?? existing.city,
          state: dto.state?.trim() ?? existing.state,
          postalCode: dto.postalCode?.trim() ?? existing.postalCode,
          country: dto.country?.trim() ?? existing.country,
          isPrimary: dto.isPrimary !== undefined ? dto.isPrimary : existing.isPrimary,
        },
      });
    });

    return {
      success: true,
      data: { address },
      message: 'Seller address updated successfully',
    };
  }

  async deleteAddress(userId: string, addressId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const existing = await this.prisma.sellerAddress.findUnique({ where: { id: addressId } });
    if (!existing) {
      throw new NotFoundException('Seller address not found');
    }

    if (existing.sellerId !== profile.id) {
      throw new ForbiddenException('You are not authorized to delete this address');
    }

    await this.prisma.sellerAddress.delete({ where: { id: addressId } });

    return {
      success: true,
      data: null,
      message: 'Seller address removed successfully',
    };
  }

  async submitDocument(userId: string, dto: SubmitDocumentDto): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        verifications: {
          orderBy: { submissionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    if (profile.status === SellerStatus.BLOCKED) {
      throw new ForbiddenException('Blocked seller accounts cannot submit documents');
    }

    let activeVerification = profile.verifications[0];
    if (!activeVerification || activeVerification.status === VerificationStatus.REJECTED) {
      // Create new pending verification submission if none exists or last was rejected
      const nextSubmissionNumber = (activeVerification?.submissionNumber || 0) + 1;
      activeVerification = await this.prisma.sellerVerification.create({
        data: {
          sellerId: profile.id,
          submissionNumber: nextSubmissionNumber,
          status: VerificationStatus.PENDING,
        },
      });
    }

    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(dto.fileBase64, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64 document content');
    }

    const storedResult = await this.storageService.uploadVerificationDocument({
      sellerId: profile.id,
      submissionNumber: activeVerification.submissionNumber,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileBuffer,
    });

    const document = await this.prisma.verificationDocument.create({
      data: {
        verificationId: activeVerification.id,
        documentType: dto.documentType,
        fileKey: storedResult.fileKey,
        fileName: storedResult.fileName,
        mimeType: storedResult.mimeType,
        fileSize: storedResult.fileSize,
      },
    });

    await this.auditService.logAction({
      userId,
      action: 'DOCUMENT_SUBMITTED',
      resourceType: 'VerificationDocument',
      resourceId: document.id,
      newValue: {
        verificationId: activeVerification.id,
        documentType: document.documentType,
        fileName: document.fileName,
        fileSize: document.fileSize,
      },
    });

    return {
      success: true,
      data: {
        document: {
          id: document.id,
          verificationId: document.verificationId,
          documentType: document.documentType,
          fileName: document.fileName,
          fileSize: document.fileSize,
          status: document.status,
          uploadedAt: document.uploadedAt,
        },
      },
      message: 'Seller document submitted successfully',
    };
  }

  async getOwnDocuments(userId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        verifications: {
          include: {
            verificationDocuments: true,
          },
          orderBy: { submissionNumber: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const documents = profile.verifications.flatMap((v) =>
      v.verificationDocuments.map((doc) => ({
        id: doc.id,
        submissionNumber: v.submissionNumber,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        status: doc.status,
        reviewRemarks: doc.reviewRemarks,
        reviewedAt: doc.reviewedAt,
        uploadedAt: doc.uploadedAt,
      })),
    );

    return {
      success: true,
      data: { documents },
      message: 'Seller documents retrieved successfully',
    };
  }

  async getStatus(userId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        verifications: {
          orderBy: { submissionNumber: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    const latest = profile.verifications[0] || null;

    return {
      success: true,
      data: {
        sellerId: profile.id,
        status: profile.status,
        latestVerification: latest
          ? {
              submissionNumber: latest.submissionNumber,
              status: latest.status,
              rejectionReason: latest.rejectionReason,
              submittedAt: latest.submittedAt,
              reviewedAt: latest.reviewedAt,
            }
          : null,
      },
      message: 'Seller status retrieved successfully',
    };
  }

  async resubmitVerification(userId: string): Promise<any> {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        verifications: {
          orderBy: { submissionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Seller profile not found');
    }

    if (profile.status === SellerStatus.BLOCKED) {
      throw new ForbiddenException('Blocked sellers cannot resubmit verification');
    }

    const latest = profile.verifications[0];
    if (latest && latest.status === VerificationStatus.PENDING) {
      throw new BadRequestException('A verification submission is already pending review');
    }

    const nextSubmissionNumber = (latest?.submissionNumber || 0) + 1;

    const newVerification = await this.prisma.$transaction(async (tx) => {
      await tx.sellerProfile.update({
        where: { id: profile.id },
        data: { status: SellerStatus.PENDING },
      });

      return tx.sellerVerification.create({
        data: {
          sellerId: profile.id,
          submissionNumber: nextSubmissionNumber,
          status: VerificationStatus.PENDING,
        },
      });
    });

    await this.auditService.logAction({
      userId,
      action: 'VERIFICATION_RESUBMITTED',
      resourceType: 'SellerVerification',
      resourceId: newVerification.id,
      newValue: {
        submissionNumber: newVerification.submissionNumber,
      },
    });

    return {
      success: true,
      data: {
        verificationId: newVerification.id,
        submissionNumber: newVerification.submissionNumber,
        status: newVerification.status,
      },
      message: 'Verification resubmitted successfully. Please upload required documents.',
    };
  }

  // ================= ADMIN OPERATIONS =================

  async listSellers(query: SellerQueryDto): Promise<any> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SellerProfileWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { businessName: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sort || 'createdAt';
    const sortOrder = query.order || 'desc';

    const [items, totalItems] = await Promise.all([
      this.prisma.sellerProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: sortOrder },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              accountStatus: true,
            },
          },
          verifications: {
            orderBy: { submissionNumber: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.sellerProfile.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          userId: item.userId,
          sellerType: item.sellerType,
          displayName: item.displayName,
          businessName: item.businessName,
          contactEmail: item.contactEmail,
          status: item.status,
          user: item.user,
          latestVerification: item.verifications[0] || null,
          createdAt: item.createdAt,
        })),
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      },
      message: 'Sellers retrieved successfully',
    };
  }

  async getSellerDetails(sellerId: string): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            accountStatus: true,
            emailVerified: true,
          },
        },
        addresses: true,
        verifications: {
          orderBy: { submissionNumber: 'desc' },
          include: {
            verificationDocuments: true,
            reviewedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        sellerCategories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return {
      success: true,
      data: { seller },
      message: 'Seller details retrieved successfully',
    };
  }

  async approveSeller(adminUserId: string, sellerId: string, dto: ApproveSellerDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        addresses: true,
        verifications: {
          orderBy: { submissionNumber: 'desc' },
          take: 1,
          include: { verificationDocuments: true },
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (seller.status === SellerStatus.APPROVED) {
      throw new BadRequestException('Seller is already approved');
    }

    // Must have at least 1 address
    if (seller.addresses.length === 0) {
      throw new BadRequestException('Cannot approve seller without a registered address');
    }

    const latestVerification = seller.verifications[0];
    if (!latestVerification) {
      throw new BadRequestException('No verification submission found for seller');
    }

    if (latestVerification.verificationDocuments.length === 0) {
      throw new BadRequestException('Cannot approve seller without submitted verification documents');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerVerification.update({
        where: { id: latestVerification.id },
        data: {
          status: VerificationStatus.APPROVED,
          reviewedAt: new Date(),
          reviewedById: adminUserId,
          notes: dto.notes?.trim() || null,
        },
      });

      await tx.verificationDocument.updateMany({
        where: { verificationId: latestVerification.id },
        data: {
          status: VerificationStatus.APPROVED,
          reviewedAt: new Date(),
        },
      });

      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: { status: SellerStatus.APPROVED },
      });

      await tx.user.update({
        where: { id: seller.userId },
        data: { accountStatus: AccountStatus.ACTIVE },
      });
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_APPROVED',
      resourceType: 'SellerProfile',
      resourceId: sellerId,
      previousValue: { status: seller.status },
      newValue: { status: SellerStatus.APPROVED, verificationId: latestVerification.id },
    });

    return {
      success: true,
      data: {
        sellerId,
        status: SellerStatus.APPROVED,
      },
      message: 'Seller approved successfully',
    };
  }

  async rejectSeller(adminUserId: string, sellerId: string, dto: RejectSellerDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        verifications: {
          orderBy: { submissionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const latestVerification = seller.verifications[0];
    if (!latestVerification) {
      throw new BadRequestException('No verification submission found for seller');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerVerification.update({
        where: { id: latestVerification.id },
        data: {
          status: VerificationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewedById: adminUserId,
          rejectionReason: dto.rejectionReason.trim(),
        },
      });

      await tx.verificationDocument.updateMany({
        where: { verificationId: latestVerification.id },
        data: {
          status: VerificationStatus.REJECTED,
          reviewedAt: new Date(),
          reviewRemarks: dto.rejectionReason.trim(),
        },
      });

      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: { status: SellerStatus.REJECTED },
      });
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_REJECTED',
      resourceType: 'SellerProfile',
      resourceId: sellerId,
      previousValue: { status: seller.status },
      newValue: {
        status: SellerStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
    });

    return {
      success: true,
      data: {
        sellerId,
        status: SellerStatus.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
      message: 'Seller verification rejected',
    };
  }

  async updateSellerStatus(adminUserId: string, sellerId: string, dto: UpdateSellerStatusDto): Promise<any> {
    const seller = await this.prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const previousStatus = seller.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerProfile.update({
        where: { id: sellerId },
        data: { status: dto.status },
      });

      if (dto.status === SellerStatus.BLOCKED) {
        await tx.user.update({
          where: { id: seller.userId },
          data: { accountStatus: AccountStatus.BLOCKED },
        });
      } else if (dto.status === SellerStatus.SUSPENDED) {
        await tx.user.update({
          where: { id: seller.userId },
          data: { accountStatus: AccountStatus.SUSPENDED },
        });
      } else if (dto.status === SellerStatus.APPROVED) {
        await tx.user.update({
          where: { id: seller.userId },
          data: { accountStatus: AccountStatus.ACTIVE },
        });
      }
    });

    await this.auditService.logAction({
      userId: adminUserId,
      action: 'SELLER_STATUS_CHANGED',
      resourceType: 'SellerProfile',
      resourceId: sellerId,
      previousValue: { status: previousStatus },
      newValue: { status: dto.status, reason: dto.reason },
    });

    return {
      success: true,
      data: {
        sellerId,
        status: dto.status,
      },
      message: 'Seller status updated successfully',
    };
  }

  async downloadDocument(
    adminUserId: string,
    sellerId: string,
    documentId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const document = await this.prisma.verificationDocument.findUnique({
      where: { id: documentId },
      include: {
        verification: true,
      },
    });

    if (!document || document.verification.sellerId !== sellerId) {
      throw new NotFoundException('Document not found for this seller');
    }

    const file = await this.storageService.getFileBuffer(document.fileKey);

    // Mandatory Audit record for sensitive KYC download
    await this.auditService.logAction({
      userId: adminUserId,
      action: 'DOWNLOAD_SELLER_DOCUMENT',
      resourceType: 'VerificationDocument',
      resourceId: documentId,
      newValue: {
        sellerId,
        fileName: document.fileName,
        documentType: document.documentType,
      },
      ipAddress,
      userAgent,
    });

    return {
      buffer: file.buffer,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }
}

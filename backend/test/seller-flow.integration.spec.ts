import {
  AccountStatus,
  AddressType,
  DocumentType,
  DocumentStatus,
  SellerStatus,
  SellerType,
  VerificationStatus,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { SellerService } from '../src/seller/seller.service';
import { AuditService } from '../src/audit/audit.service';
import { StorageService } from '../src/storage/storage.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('Seller Onboarding & Admin Verification Flow Integration', () => {
  let sellerService: SellerService;
  let auditService: AuditService;
  let storageService: StorageService;

  // In-memory relational state
  const db = {
    users: new Map<string, any>(),
    sellerProfiles: new Map<string, any>(),
    sellerVerifications: new Map<string, any>(),
    verificationDocuments: new Map<string, any>(),
    sellerAddresses: new Map<string, any>(),
    auditLogs: new Map<string, any>(),
  };

  beforeEach(() => {
    db.users.clear();
    db.sellerProfiles.clear();
    db.sellerVerifications.clear();
    db.verificationDocuments.clear();
    db.sellerAddresses.clear();
    db.auditLogs.clear();

    const configService = {
      get: jest.fn((k: string) => {
        if (k === 'APP_URL') return 'http://localhost:3000';
        if (k === 'JWT_ACCESS_SECRET') return 'integration-test-secret-key-32-chars';
        return null;
      }),
    } as unknown as ConfigService;

    storageService = new StorageService(configService);

    const mockPrisma: any = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => db.users.get(where.id) || null),
        update: jest.fn(async ({ where, data }: any) => {
          const user = db.users.get(where.id);
          if (!user) return null;
          Object.assign(user, data);
          return user;
        }),
      },
      sellerProfile: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          let profile = null;
          if (where.userId) {
            for (const p of db.sellerProfiles.values()) {
              if (p.userId === where.userId) {
                profile = p;
                break;
              }
            }
          } else if (where.id) {
            profile = db.sellerProfiles.get(where.id) || null;
          }

          if (!profile) return null;
          const result = { ...profile };
          if (include?.addresses) {
            result.addresses = Array.from(db.sellerAddresses.values()).filter((a) => a.sellerId === profile.id);
          }
          if (include?.verifications) {
            let verList = Array.from(db.sellerVerifications.values()).filter((v) => v.sellerId === profile.id);
            if (include.verifications.orderBy?.submissionNumber === 'desc') {
              verList.sort((a, b) => b.submissionNumber - a.submissionNumber);
            }
            if (include.verifications.include?.verificationDocuments) {
              verList = verList.map((v) => ({
                ...v,
                verificationDocuments: Array.from(db.verificationDocuments.values()).filter(
                  (d) => d.verificationId === v.id,
                ),
              }));
            }
            if (include.verifications.take) {
              verList = verList.slice(0, include.verifications.take);
            }
            result.verifications = verList;
          }
          if (include?.user) {
            result.user = db.users.get(profile.userId);
          }
          return result;
        }),
        findMany: jest.fn(async () => Array.from(db.sellerProfiles.values())),
        count: jest.fn(async () => db.sellerProfiles.size),
        create: jest.fn(async ({ data }: any) => {
          const id = `seller-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.sellerProfiles.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.sellerProfiles.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
      },
      sellerVerification: {
        create: jest.fn(async ({ data }: any) => {
          const id = `ver-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
          db.sellerVerifications.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.sellerVerifications.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
      },
      verificationDocument: {
        create: jest.fn(async ({ data }: any) => {
          const id = `doc-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, uploadedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
          db.verificationDocuments.set(id, record);
          return record;
        }),
        findUnique: jest.fn(async ({ where, include }: any) => {
          const doc = db.verificationDocuments.get(where.id);
          if (!doc) return null;
          const result = { ...doc };
          if (include?.verification) {
            result.verification = db.sellerVerifications.get(doc.verificationId);
          }
          return result;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const doc of db.verificationDocuments.values()) {
            if (doc.verificationId === where.verificationId) {
              Object.assign(doc, data, { updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
      },
      sellerAddress: {
        count: jest.fn(async ({ where }: any) => {
          return Array.from(db.sellerAddresses.values()).filter((a) => a.sellerId === where.sellerId).length;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return Array.from(db.sellerAddresses.values()).filter((a) => a.sellerId === where.sellerId);
        }),
        findUnique: jest.fn(async ({ where }: any) => db.sellerAddresses.get(where.id) || null),
        create: jest.fn(async ({ data }: any) => {
          const id = `addr-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
          db.sellerAddresses.set(id, record);
          return record;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const record = db.sellerAddresses.get(where.id);
          if (!record) return null;
          Object.assign(record, data, { updatedAt: new Date() });
          return record;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const addr of db.sellerAddresses.values()) {
            if (addr.sellerId === where.sellerId && (!where.id || addr.id !== where.id.not)) {
              Object.assign(addr, data, { updatedAt: new Date() });
              count++;
            }
          }
          return { count };
        }),
        delete: jest.fn(async ({ where }: any) => {
          const record = db.sellerAddresses.get(where.id);
          db.sellerAddresses.delete(where.id);
          return record;
        }),
      },
      auditLog: {
        create: jest.fn(async ({ data }: any) => {
          const id = `audit-${Date.now()}-${Math.random()}`;
          const record = { id, ...data, createdAt: new Date() };
          db.auditLogs.set(id, record);
          return record;
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(mockPrisma)),
    };

    auditService = new AuditService(mockPrisma);
    sellerService = new SellerService(mockPrisma, auditService, storageService);
  });

  it('runs complete seller onboarding, rejection, resubmission, approval, and audit lifecycle', async () => {
    // 1. Setup User
    const sellerUserId = 'user-seller-1';
    db.users.set(sellerUserId, {
      id: sellerUserId,
      fullName: 'Rahul Sharma',
      email: 'rahul.seller@example.com',
      accountType: 'SELLER',
      accountStatus: AccountStatus.PENDING,
    });

    const adminUserId = 'user-admin-1';
    db.users.set(adminUserId, {
      id: adminUserId,
      fullName: 'Admin User',
      email: 'admin@marketplace.com',
      accountType: 'ADMIN',
      accountStatus: AccountStatus.ACTIVE,
    });

    // 2. Seller creates Onboarding Profile
    const createRes = await sellerService.createSellerProfile(sellerUserId, {
      sellerType: SellerType.BUSINESS,
      businessName: 'Sharma Electronics Pvt Ltd',
      displayName: 'Sharma Electronics',
      businessDescription: 'Wholesale electronics retailer',
      contactEmail: 'rahul.seller@example.com',
      contactMobile: '+919876543210',
    });

    expect(createRes.success).toBe(true);
    const sellerId = createRes.data.seller.id;
    expect(createRes.data.seller.status).toBe(SellerStatus.PENDING);

    // Verify initial verification created
    const statusRes = await sellerService.getStatus(sellerUserId);
    expect(statusRes.data.status).toBe(SellerStatus.PENDING);
    expect(statusRes.data.latestVerification.submissionNumber).toBe(1);

    // 3. Seller adds Pickup Address
    const addressRes = await sellerService.addAddress(sellerUserId, {
      addressType: AddressType.PICKUP,
      addressLine1: 'Warehouse 4B, Okhla Phase 3',
      city: 'New Delhi',
      state: 'Delhi',
      postalCode: '110020',
      isPrimary: true,
    });
    expect(addressRes.success).toBe(true);
    expect(addressRes.data.address.isPrimary).toBe(true);

    // 4. Seller uploads KYC Document (PAN Card)
    const panBase64 = Buffer.from('Mock PAN Card document content').toString('base64');
    const docRes = await sellerService.submitDocument(sellerUserId, {
      documentType: DocumentType.PAN,
      fileName: 'pan_card.pdf',
      mimeType: 'application/pdf',
      fileBase64: panBase64,
    });
    expect(docRes.success).toBe(true);
    const docId = docRes.data.document.id;

    // 5. Super Admin reviews and Rejects Attempt #1 due to blurry document
    const rejectRes = await sellerService.rejectSeller(adminUserId, sellerId, {
      rejectionReason: 'The PAN card copy is blurry and unreadable. Please provide a clear scan.',
    });
    expect(rejectRes.success).toBe(true);
    expect(rejectRes.data.status).toBe(SellerStatus.REJECTED);

    // Check seller status shows rejection reason
    const rejectedStatus = await sellerService.getStatus(sellerUserId);
    expect(rejectedStatus.data.status).toBe(SellerStatus.REJECTED);
    expect(rejectedStatus.data.latestVerification.rejectionReason).toContain('blurry');

    // 6. Seller Resubmits verification (Attempt #2)
    const resubmitRes = await sellerService.resubmitVerification(sellerUserId);
    expect(resubmitRes.success).toBe(true);
    expect(resubmitRes.data.submissionNumber).toBe(2);

    // Seller uploads clear document for attempt #2
    const clearPanBase64 = Buffer.from('High Resolution Clear PAN Document Content').toString('base64');
    const doc2Res = await sellerService.submitDocument(sellerUserId, {
      documentType: DocumentType.PAN,
      fileName: 'pan_card_hd.pdf',
      mimeType: 'application/pdf',
      fileBase64: clearPanBase64,
    });
    const doc2Id = doc2Res.data.document.id;

    // 7. Super Admin Approves Seller
    const approveRes = await sellerService.approveSeller(adminUserId, sellerId, {
      notes: 'Verified against national records. Approved for marketplace operations.',
    });
    expect(approveRes.success).toBe(true);
    expect(approveRes.data.status).toBe(SellerStatus.APPROVED);

    // Verify User account status became ACTIVE
    const sellerUser = db.users.get(sellerUserId);
    expect(sellerUser.accountStatus).toBe(AccountStatus.ACTIVE);

    // 8. Super Admin downloads KYC Document and verifies download audit log
    const downloaded = await sellerService.downloadDocument(
      adminUserId,
      sellerId,
      doc2Id,
      '192.168.1.100',
      'Mozilla/5.0 Admin Browser',
    );
    expect(downloaded.fileName).toBe('pan_card_hd.pdf');
    expect(downloaded.buffer.toString()).toBe('High Resolution Clear PAN Document Content');

    // Verify download audit log
    const downloadAuditLogs = Array.from(db.auditLogs.values()).filter(
      (a) => a.action === 'DOWNLOAD_SELLER_DOCUMENT',
    );
    expect(downloadAuditLogs).toHaveLength(1);
    expect(downloadAuditLogs[0].userId).toBe(adminUserId);
    expect(downloadAuditLogs[0].resourceId).toBe(doc2Id);
    expect(downloadAuditLogs[0].ipAddress).toBe('192.168.1.100');

    // 9. Admin blocks seller -> blocked seller cannot upload documents
    await sellerService.updateSellerStatus(adminUserId, sellerId, {
      status: SellerStatus.BLOCKED,
      reason: 'Repeated non-compliance with terms of service',
    });

    expect(sellerUser.accountStatus).toBe(AccountStatus.BLOCKED);

    await expect(
      sellerService.submitDocument(sellerUserId, {
        documentType: DocumentType.GST,
        fileName: 'gst.pdf',
        mimeType: 'application/pdf',
        fileBase64: panBase64,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});

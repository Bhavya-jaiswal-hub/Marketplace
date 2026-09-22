import { ConfigService } from '@nestjs/config';
import { StorageService } from '../src/storage/storage.service';
import { BadRequestException } from '@nestjs/common';

describe('StorageService', () => {
  let service: StorageService;
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'APP_URL') return 'http://localhost:3000';
        if (key === 'JWT_ACCESS_SECRET') return 'test-secret-key-storage-32-chars';
        return null;
      }),
    };
    service = new StorageService(configService as ConfigService);
  });

  it('validates allowed MIME types and max file sizes', () => {
    expect(() => service.validateFile('application/pdf', 1024 * 1024)).not.toThrow();
    expect(() => service.validateFile('image/jpeg', 2 * 1024 * 1024)).not.toThrow();
    expect(() => service.validateFile('image/png', 5 * 1024 * 1024)).not.toThrow();

    expect(() => service.validateFile('application/zip', 1024)).toThrow(BadRequestException);
    expect(() => service.validateFile('application/x-msdownload', 1024)).toThrow(BadRequestException);
    expect(() => service.validateFile('application/pdf', 15 * 1024 * 1024)).toThrow(BadRequestException);
  });

  it('uploads a verification document and returns stored file details', async () => {
    const dummyBuffer = Buffer.from('Mock PDF Content for Aadhaar Verification');
    const result = await service.uploadVerificationDocument({
      sellerId: 'seller-uuid-1',
      submissionNumber: 1,
      fileName: 'aadhaar_card.pdf',
      mimeType: 'application/pdf',
      fileBuffer: dummyBuffer,
    });

    expect(result.fileKey).toContain('sellers/seller-uuid-1/verifications/1/');
    expect(result.fileKey).toContain('aadhaar_card.pdf');
    expect(result.fileName).toBe('aadhaar_card.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileSize).toBe(dummyBuffer.length);

    const retrieved = await service.getFileBuffer(result.fileKey);
    expect(retrieved.buffer.toString()).toBe('Mock PDF Content for Aadhaar Verification');
  });

  it('generates and verifies secure HMAC download signatures', () => {
    const url = service.generateSecureDownloadUrl('seller-uuid-1', 'doc-uuid-1', 15);
    expect(url).toContain('/api/v1/admin/sellers/seller-uuid-1/documents/doc-uuid-1/download');
    expect(url).toContain('expires=');
    expect(url).toContain('signature=');

    const parsedUrl = new URL(url);
    const expires = Number(parsedUrl.searchParams.get('expires'));
    const signature = parsedUrl.searchParams.get('signature')!;

    const isValid = service.verifyDownloadSignature('seller-uuid-1', 'doc-uuid-1', expires, signature);
    expect(isValid).toBe(true);

    const isTampered = service.verifyDownloadSignature('seller-uuid-2', 'doc-uuid-1', expires, signature);
    expect(isTampered).toBe(false);

    const isExpired = service.verifyDownloadSignature('seller-uuid-1', 'doc-uuid-1', Date.now() - 1000, signature);
    expect(isExpired).toBe(false);
  });
});

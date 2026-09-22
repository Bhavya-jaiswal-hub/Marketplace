import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadFileOptions {
  sellerId: string;
  submissionNumber: number;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

export interface StoredFileResult {
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly localStorageDir: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    this.localStorageDir = path.resolve(process.cwd(), 'storage_private');
    if (!fs.existsSync(this.localStorageDir)) {
      fs.mkdirSync(this.localStorageDir, { recursive: true });
    }
  }

  validateFile(mimeType: string, fileSize: number): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file format: ${mimeType}. Allowed formats: PDF, JPEG, PNG, WEBP.`,
      );
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds limit of 10MB (received ${(fileSize / (1024 * 1024)).toFixed(2)}MB).`,
      );
    }
  }

  async uploadVerificationDocument(options: UploadFileOptions): Promise<StoredFileResult> {
    this.validateFile(options.mimeType, options.fileBuffer.length);

    const sanitizedFileName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const randomUuid = crypto.randomUUID();
    const fileKey = `sellers/${options.sellerId}/verifications/${options.submissionNumber}/${randomUuid}-${sanitizedFileName}`;

    const filePath = path.join(this.localStorageDir, fileKey);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, options.fileBuffer);

    this.logger.log(`Stored verification document securely at key: ${fileKey}`);

    return {
      fileKey,
      fileName: options.fileName,
      mimeType: options.mimeType,
      fileSize: options.fileBuffer.length,
    };
  }

  async getFileBuffer(fileKey: string): Promise<{ buffer: Buffer; mimeType?: string }> {
    const filePath = path.join(this.localStorageDir, fileKey);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`Document file not found for key: ${fileKey}`);
    }
    const buffer = await fs.promises.readFile(filePath);
    return { buffer };
  }

  generateSecureDownloadUrl(sellerId: string, documentId: string, expiresInMinutes = 15): string {
    const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'storage-secret';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${sellerId}:${documentId}:${expiresAt}`)
      .digest('hex');

    return `${this.appUrl}/api/v1/admin/sellers/${sellerId}/documents/${documentId}/download?expires=${expiresAt}&signature=${signature}`;
  }

  verifyDownloadSignature(sellerId: string, documentId: string, expires: number, signature: string): boolean {
    if (Date.now() > expires) {
      return false;
    }
    const secret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'storage-secret';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${sellerId}:${documentId}:${expires}`)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}

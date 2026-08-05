import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanConfirm,
  assertFileReady,
  assertPurpose,
  assertUploadConstraints,
  buildObjectKey,
  type FilePurpose,
  type FileVisibility,
} from '../domain/file.rules';
import {
  FILE_REPOSITORY,
  OBJECT_STORAGE,
  type FileRepository,
  type ObjectStorage,
} from './ports/file.repository';
import { randomUUID } from 'node:crypto';

const UPLOAD_TTL = 15 * 60;
const DOWNLOAD_TTL = 10 * 60;

@Injectable()
export class CreateUploadUrlUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly files: FileRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: string;
    visibility?: FileVisibility;
    purpose?: string;
  }) {
    const purpose = assertPurpose(input.purpose ?? 'other');
    const sizeBytes = parseSize(input.sizeBytes);
    assertUploadConstraints({
      purpose,
      mimeType: input.mimeType,
      sizeBytes,
    });

    const fileId = randomUUID();
    const bucket = this.storage.defaultBucket();
    const objectKey = buildObjectKey({
      organizationId: input.organizationId,
      purpose,
      fileId,
      originalFilename: input.originalFilename,
    });

    const file = await this.files.create({
      id: fileId,
      organizationId: input.organizationId,
      bucket,
      objectKey,
      originalFilename: input.originalFilename.trim(),
      mimeType: input.mimeType.trim().toLowerCase(),
      sizeBytes,
      visibility: input.visibility ?? 'private',
      uploadedByUserId: input.userId,
    });

    const upload = await this.storage.createUploadUrl({
      bucket,
      objectKey,
      mimeType: file.mimeType,
      sizeBytes,
      expiresInSeconds: UPLOAD_TTL,
    });

    return {
      file,
      uploadUrl: upload.url,
      headers: upload.headers ?? { 'Content-Type': file.mimeType },
      expiresAt: upload.expiresAt,
      storageDriver: this.storage.driver,
    };
  }
}

@Injectable()
export class ConfirmUploadUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly files: FileRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    fileId: string;
    checksumSha256?: string | null;
  }) {
    const file = await this.files.findById(input.organizationId, input.fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    if (file.uploadedByUserId && file.uploadedByUserId !== input.userId) {
      throw new DomainError('FORBIDDEN', 'Only the uploader can confirm this file');
    }
    assertCanConfirm(file.status);

    const head = await this.storage.headObject({
      bucket: file.bucket,
      objectKey: file.objectKey,
    });
    if (!head.exists) {
      throw new DomainError('UPLOAD_MISSING', 'Object not found in storage — upload first');
    }
    if (head.sizeBytes != null && head.sizeBytes > BigInt(file.sizeBytes)) {
      throw new DomainError('FILE_TOO_LARGE', 'Uploaded object exceeds declared size');
    }
    if (head.mimeType && head.mimeType !== file.mimeType) {
      // allow storage without content-type
      if (this.storage.driver !== 'mock') {
        throw new DomainError('INVALID_MIME_TYPE', 'Uploaded Content-Type mismatch');
      }
    }

    return this.files.markReady({
      organizationId: input.organizationId,
      id: file.id,
      sizeBytes: head.sizeBytes,
      mimeType: head.mimeType,
      checksumSha256: input.checksumSha256 ?? null,
    });
  }
}

@Injectable()
export class GetDownloadUrlUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly files: FileRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async execute(input: {
    organizationId: string;
    fileId: string;
    /** When false, only private signed URL; public may return CDN URL */
    preferPublic?: boolean;
  }) {
    const file = await this.files.findById(input.organizationId, input.fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    assertFileReady(file.status);

    if (file.visibility === 'public' && input.preferPublic !== false) {
      const publicUrl = this.storage.publicUrl?.({
        bucket: file.bucket,
        objectKey: file.objectKey,
      });
      if (publicUrl) {
        return { url: publicUrl, expiresAt: null, visibility: file.visibility, file };
      }
    }

    const download = await this.storage.createDownloadUrl({
      bucket: file.bucket,
      objectKey: file.objectKey,
      expiresInSeconds: DOWNLOAD_TTL,
      filename: file.originalFilename,
    });

    return {
      url: download.url,
      expiresAt: download.expiresAt,
      visibility: file.visibility,
      file,
    };
  }
}

@Injectable()
export class GetReadyFileUseCase {
  constructor(@Inject(FILE_REPOSITORY) private readonly files: FileRepository) {}

  async execute(organizationId: string, fileId: string) {
    const file = await this.files.findById(organizationId, fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    assertFileReady(file.status);
    return file;
  }
}

@Injectable()
export class DeleteFileUseCase {
  constructor(@Inject(FILE_REPOSITORY) private readonly files: FileRepository) {}

  async execute(organizationId: string, fileId: string) {
    const file = await this.files.findById(organizationId, fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    await this.files.softDelete(organizationId, fileId);
    return { ok: true as const };
  }
}

function parseSize(value: string): bigint {
  if (!/^\d+$/.test(value.trim())) {
    throw new DomainError('INVALID_FILE_SIZE', 'sizeBytes must be an integer string');
  }
  return BigInt(value.trim());
}

export type { FilePurpose };

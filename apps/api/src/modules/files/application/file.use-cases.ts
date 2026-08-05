import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanAccessOwnedOrManaged,
  assertCanConfirm,
  assertChecksumSha256,
  assertFileReady,
  assertPurpose,
  assertUploadConstraints,
  buildObjectKey,
  managePermissionForPurpose,
  normalizeMimeType,
  purposeFromObjectKey,
  resolveVisibility,
  uploadPermissionForPurpose,
  type FilePurpose,
  type FileVisibility,
} from '../domain/file.rules';
import {
  FILE_REPOSITORY,
  OBJECT_STORAGE,
  type FileRepository,
  type FileView,
  type ObjectStorage,
} from './ports/file.repository';
import { randomUUID } from 'node:crypto';
import { AuthorizationService } from '../../rbac/application/rbac.use-cases';

const UPLOAD_TTL = 15 * 60;
const DOWNLOAD_TTL = 10 * 60;

@Injectable()
export class CreateUploadUrlUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly files: FileRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly authz: AuthorizationService,
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
    const mimeType = normalizeMimeType(input.mimeType);
    const sizeBytes = parseSize(input.sizeBytes);
    assertUploadConstraints({ purpose, mimeType, sizeBytes });

    const uploadPerm = uploadPermissionForPurpose(purpose);
    if (uploadPerm) {
      await this.authz.assertPermissions({
        organizationId: input.organizationId,
        userId: input.userId,
        permissionKeys: [uploadPerm],
      });
    }

    const visibility = resolveVisibility(purpose, input.visibility);
    if (visibility === 'public') {
      const manage = managePermissionForPurpose(purpose);
      if (manage) {
        await this.authz.assertPermissions({
          organizationId: input.organizationId,
          userId: input.userId,
          permissionKeys: [manage],
        });
      }
    }

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
      originalFilename: input.originalFilename.trim() || 'file',
      mimeType,
      sizeBytes,
      visibility,
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
    const checksumSha256 = assertChecksumSha256(input.checksumSha256);

    const head = await this.storage.headObject({
      bucket: file.bucket,
      objectKey: file.objectKey,
    });
    if (!head.exists) {
      throw new DomainError('UPLOAD_MISSING', 'Object not found in storage — upload first');
    }
    const declared = BigInt(file.sizeBytes);
    if (head.sizeBytes != null) {
      if (head.sizeBytes > declared) {
        throw new DomainError('FILE_TOO_LARGE', 'Uploaded object exceeds declared size');
      }
      if (head.sizeBytes < declared) {
        throw new DomainError('UPLOAD_INCOMPLETE', 'Uploaded object is smaller than declared size');
      }
    }
    if (head.mimeType && this.storage.driver !== 'mock') {
      const headMime = normalizeMimeType(head.mimeType);
      if (headMime && headMime !== file.mimeType) {
        throw new DomainError('INVALID_MIME_TYPE', 'Uploaded Content-Type mismatch');
      }
    }

    return this.files.markReady({
      organizationId: input.organizationId,
      id: file.id,
      sizeBytes: head.sizeBytes,
      mimeType: head.mimeType ? normalizeMimeType(head.mimeType) : undefined,
      checksumSha256,
    });
  }
}

@Injectable()
export class GetDownloadUrlUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly files: FileRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly authz: AuthorizationService,
  ) {}

  async execute(input: {
    organizationId: string;
    userId: string;
    fileId: string;
    preferPublic?: boolean;
  }) {
    const file = await this.requireReady(input.organizationId, input.fileId);
    await this.assertAccess(input.organizationId, input.userId, file, 'download');

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

  private async requireReady(organizationId: string, fileId: string) {
    const file = await this.files.findById(organizationId, fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    assertFileReady(file.status);
    return file;
  }

  private async assertAccess(
    organizationId: string,
    userId: string,
    file: FileView,
    action: 'download' | 'delete',
  ) {
    const purpose =
      (file.purpose ? assertPurposeSafe(file.purpose) : null) ??
      purposeFromObjectKey(file.objectKey);
    const manageKey = purpose ? managePermissionForPurpose(purpose) : null;
    const hasManagePermission = manageKey
      ? await this.authz.hasPermission({
          organizationId,
          userId,
          permissionKey: manageKey,
        })
      : false;
    assertCanAccessOwnedOrManaged({
      visibility: file.visibility,
      uploadedByUserId: file.uploadedByUserId,
      actorUserId: userId,
      hasManagePermission,
      action,
    });
  }
}

function assertPurposeSafe(purpose: string): FilePurpose | null {
  try {
    return assertPurpose(purpose);
  } catch {
    return null;
  }
}

@Injectable()
export class GetReadyFileUseCase {
  constructor(@Inject(FILE_REPOSITORY) private readonly files: FileRepository) {}

  async execute(
    organizationId: string,
    fileId: string,
    options?: { purposes?: readonly FilePurpose[] },
  ) {
    const file = await this.files.findById(organizationId, fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    assertFileReady(file.status);

    if (options?.purposes?.length) {
      const purpose =
        (file.purpose ? assertPurposeSafe(file.purpose) : null) ??
        purposeFromObjectKey(file.objectKey);
      if (!purpose || !options.purposes.includes(purpose)) {
        throw new DomainError(
          'INVALID_FILE_PURPOSE',
          `File must have purpose: ${options.purposes.join(' | ')}`,
        );
      }
    }

    return file;
  }
}

@Injectable()
export class DeleteFileUseCase {
  constructor(
    @Inject(FILE_REPOSITORY) private readonly files: FileRepository,
    private readonly authz: AuthorizationService,
  ) {}

  async execute(organizationId: string, userId: string, fileId: string) {
    const file = await this.files.findById(organizationId, fileId);
    if (!file) throw new DomainError('FILE_NOT_FOUND', 'File not found');

    const purpose =
      (file.purpose ? assertPurposeSafe(file.purpose) : null) ??
      purposeFromObjectKey(file.objectKey);
    const manageKey = purpose ? managePermissionForPurpose(purpose) : null;
    const hasManagePermission = manageKey
      ? await this.authz.hasPermission({
          organizationId,
          userId,
          permissionKey: manageKey,
        })
      : false;

    assertCanAccessOwnedOrManaged({
      visibility: file.visibility,
      uploadedByUserId: file.uploadedByUserId,
      actorUserId: userId,
      hasManagePermission,
      action: 'delete',
    });

    await this.files.softDelete(organizationId, fileId);
    return { ok: true as const };
  }
}

function parseSize(value: string): bigint {
  if (!/^\d+$/.test(value.trim())) {
    throw new DomainError('INVALID_FILE_SIZE', 'sizeBytes must be an integer string');
  }
  const size = BigInt(value.trim());
  if (size <= 0n) {
    throw new DomainError('INVALID_FILE_SIZE', 'sizeBytes must be greater than zero');
  }
  return size;
}

export type { FilePurpose };

import { Injectable } from '@nestjs/common';
import { DomainError } from '@association/shared-kernel';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { FileStatus, FileVisibility } from '../domain/file.rules';
import type { FileRepository, FileView } from '../application/ports/file.repository';

@Injectable()
export class PrismaFileRepository implements FileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    id?: string;
    organizationId: string;
    bucket: string;
    objectKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: bigint;
    visibility: FileVisibility;
    uploadedByUserId?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      const row = await tx.fileObject.create({
        data: {
          ...(input.id ? { id: input.id } : {}),
          organizationId: input.organizationId,
          bucket: input.bucket,
          objectKey: input.objectKey,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          visibility: input.visibility,
          uploadedByUserId: input.uploadedByUserId ?? null,
          status: 'pending',
        },
      });
      return mapFile(row);
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.asTenant(organizationId, async (tx) => {
      const row = await tx.fileObject.findFirst({
        where: { id, organizationId, deletedAt: null },
      });
      return row ? mapFile(row) : null;
    });
  }

  async markReady(input: {
    organizationId: string;
    id: string;
    sizeBytes?: bigint;
    mimeType?: string;
    checksumSha256?: string | null;
  }) {
    return this.prisma.asTenant(input.organizationId, async (tx) => {
      await tx.fileObject.updateMany({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
        data: {
          status: 'ready',
          ...(input.sizeBytes !== undefined ? { sizeBytes: input.sizeBytes } : {}),
          ...(input.mimeType !== undefined ? { mimeType: input.mimeType } : {}),
          ...(input.checksumSha256 !== undefined ? { checksumSha256: input.checksumSha256 } : {}),
        },
      });
      const row = await tx.fileObject.findFirst({
        where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
      });
      if (!row) throw new DomainError('FILE_NOT_FOUND', 'File not found');
      return mapFile(row);
    });
  }

  async softDelete(organizationId: string, id: string) {
    await this.prisma.asTenant(organizationId, async (tx) => {
      const result = await tx.fileObject.updateMany({
        where: { id, organizationId, deletedAt: null },
        data: { status: 'deleted', deletedAt: new Date() },
      });
      if (result.count === 0) throw new DomainError('FILE_NOT_FOUND', 'File not found');
    });
  }
}

function mapFile(row: {
  id: string;
  organizationId: string;
  bucket: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  checksumSha256: string | null;
  visibility: FileVisibility;
  uploadedByUserId: string | null;
  status: FileStatus;
  createdAt: Date;
  updatedAt: Date;
}): FileView {
  const purpose = purposeFromKey(row.objectKey);
  return {
    id: row.id,
    organizationId: row.organizationId,
    bucket: row.bucket,
    objectKey: row.objectKey,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes.toString(),
    checksumSha256: row.checksumSha256,
    visibility: row.visibility,
    uploadedByUserId: row.uploadedByUserId,
    status: row.status,
    purpose,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function purposeFromKey(objectKey: string): string | null {
  const parts = objectKey.split('/');
  // orgs/{orgId}/{purpose}/...
  return parts[2] ?? null;
}

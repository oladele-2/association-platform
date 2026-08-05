import type { FileStatus, FileVisibility } from '../../domain/file.rules';

export type FileView = {
  id: string;
  organizationId: string;
  bucket: string;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  checksumSha256: string | null;
  visibility: FileVisibility;
  uploadedByUserId: string | null;
  status: FileStatus;
  purpose: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface FileRepository {
  create(input: {
    id?: string;
    organizationId: string;
    bucket: string;
    objectKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: bigint;
    visibility: FileVisibility;
    uploadedByUserId?: string | null;
  }): Promise<FileView>;
  findById(organizationId: string, id: string): Promise<FileView | null>;
  markReady(input: {
    organizationId: string;
    id: string;
    sizeBytes?: bigint;
    mimeType?: string;
    checksumSha256?: string | null;
  }): Promise<FileView>;
  softDelete(organizationId: string, id: string): Promise<void>;
}

export const FILE_REPOSITORY = Symbol('FILE_REPOSITORY');

export interface ObjectStorage {
  readonly driver: 'mock' | 'r2';
  defaultBucket(): string;
  createUploadUrl(input: {
    bucket: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: bigint;
    expiresInSeconds: number;
  }): Promise<{ url: string; headers?: Record<string, string>; expiresAt: string }>;
  createDownloadUrl(input: {
    bucket: string;
    objectKey: string;
    expiresInSeconds: number;
    filename?: string;
  }): Promise<{ url: string; expiresAt: string }>;
  headObject(input: {
    bucket: string;
    objectKey: string;
  }): Promise<{ exists: boolean; sizeBytes?: bigint; mimeType?: string }>;
  publicUrl?(input: { bucket: string; objectKey: string }): string | null;
}

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

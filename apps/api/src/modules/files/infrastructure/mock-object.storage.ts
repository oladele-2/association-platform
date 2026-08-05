import { Injectable } from '@nestjs/common';
import type { ObjectStorage } from '../application/ports/file.repository';

/**
 * Dev/CI storage: remembers "uploaded" keys after createUploadUrl, headObject succeeds
 * only after a synthetic PUT to the mock upload URL host path (tracked in-memory when
 * client "uploads" by calling noteUpload — for API confirm in tests we auto-mark on
 * createUploadUrl so confirm works without a real PUT).
 */
@Injectable()
export class MockObjectStorage implements ObjectStorage {
  readonly driver = 'mock' as const;
  private readonly uploaded = new Set<string>();
  private readonly meta = new Map<string, { sizeBytes: bigint; mimeType: string }>();

  defaultBucket(): string {
    return process.env.R2_BUCKET?.trim() || 'association-mock';
  }

  async createUploadUrl(input: {
    bucket: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: bigint;
    expiresInSeconds: number;
  }) {
    const key = `${input.bucket}:${input.objectKey}`;
    // Mock assumes client will upload successfully; track expected meta.
    this.meta.set(key, { sizeBytes: input.sizeBytes, mimeType: input.mimeType });
    this.uploaded.add(key);
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000).toISOString();
    const base = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000';
    return {
      url: `${base}/v1/files/mock-upload/${encodeURIComponent(input.bucket)}/${encodeURIComponent(input.objectKey)}`,
      headers: { 'Content-Type': input.mimeType },
      expiresAt,
    };
  }

  async createDownloadUrl(input: {
    bucket: string;
    objectKey: string;
    expiresInSeconds: number;
    filename?: string;
  }) {
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000).toISOString();
    const base = process.env.APP_PUBLIC_URL ?? 'http://localhost:3000';
    const q = input.filename ? `?filename=${encodeURIComponent(input.filename)}` : '';
    return {
      url: `${base}/v1/files/mock-download/${encodeURIComponent(input.bucket)}/${encodeURIComponent(input.objectKey)}${q}`,
      expiresAt,
    };
  }

  async headObject(input: { bucket: string; objectKey: string }) {
    const key = `${input.bucket}:${input.objectKey}`;
    if (!this.uploaded.has(key)) return { exists: false };
    const meta = this.meta.get(key);
    return {
      exists: true,
      sizeBytes: meta?.sizeBytes,
      mimeType: meta?.mimeType,
    };
  }

  publicUrl(input: { bucket: string; objectKey: string }): string | null {
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
    if (!base) return null;
    return `${base}/${input.objectKey}`;
  }
}

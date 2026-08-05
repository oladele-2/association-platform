import { Injectable } from '@nestjs/common';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ObjectStorage } from '../application/ports/file.repository';

@Injectable()
export class R2ObjectStorage implements ObjectStorage {
  readonly driver = 'r2' as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string | undefined;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID!.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID!.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!.trim();
    this.bucket = process.env.R2_BUCKET!.trim();
    this.publicBase = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || undefined;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  defaultBucket(): string {
    return this.bucket;
  }

  async createUploadUrl(input: {
    bucket: string;
    objectKey: string;
    mimeType: string;
    sizeBytes: bigint;
    expiresInSeconds: number;
  }) {
    const command = new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
      ContentType: input.mimeType,
      ContentLength: Number(input.sizeBytes),
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      url,
      headers: { 'Content-Type': input.mimeType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
    };
  }

  async createDownloadUrl(input: {
    bucket: string;
    objectKey: string;
    expiresInSeconds: number;
    filename?: string;
  }) {
    const command = new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.objectKey,
      ...(input.filename
        ? {
            ResponseContentDisposition: `attachment; filename="${input.filename.replace(/"/g, '')}"`,
          }
        : {}),
    });
    const url = await getSignedUrl(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });
    return {
      url,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
    };
  }

  async headObject(input: { bucket: string; objectKey: string }) {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
      );
      return {
        exists: true,
        sizeBytes: result.ContentLength != null ? BigInt(result.ContentLength) : undefined,
        mimeType: result.ContentType,
      };
    } catch {
      return { exists: false };
    }
  }

  publicUrl(input: { bucket: string; objectKey: string }): string | null {
    if (!this.publicBase) return null;
    return `${this.publicBase}/${input.objectKey}`;
  }
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
    process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_BUCKET?.trim(),
  );
}

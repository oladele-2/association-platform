import { describe, expect, it, vi } from 'vitest';
import { ConfirmUploadUseCase, CreateUploadUrlUseCase } from './file.use-cases';
import type { FileRepository, ObjectStorage } from './ports/file.repository';

describe('CreateUploadUrlUseCase', () => {
  it('creates pending file and returns upload URL', async () => {
    const files = {
      create: vi.fn().mockResolvedValue({
        id: 'f1',
        mimeType: 'image/jpeg',
        status: 'pending',
      }),
    } as unknown as FileRepository;
    const storage = {
      driver: 'mock',
      defaultBucket: () => 'bucket',
      createUploadUrl: vi.fn().mockResolvedValue({
        url: 'https://upload',
        expiresAt: '2026-01-01T00:00:00.000Z',
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    } as unknown as ObjectStorage;

    const usecase = new CreateUploadUrlUseCase(files, storage);
    const result = await usecase.execute({
      organizationId: 'o1',
      userId: 'u1',
      originalFilename: 'a.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: '1024',
      purpose: 'member_photo',
    });

    expect(result.uploadUrl).toBe('https://upload');
    expect(files.create).toHaveBeenCalled();
  });
});

describe('ConfirmUploadUseCase', () => {
  it('marks ready when object exists', async () => {
    const files = {
      findById: vi.fn().mockResolvedValue({
        id: 'f1',
        status: 'pending',
        uploadedByUserId: 'u1',
        bucket: 'b',
        objectKey: 'k',
        mimeType: 'image/jpeg',
        sizeBytes: '1024',
      }),
      markReady: vi.fn().mockResolvedValue({ id: 'f1', status: 'ready' }),
    } as unknown as FileRepository;
    const storage = {
      driver: 'mock',
      headObject: vi.fn().mockResolvedValue({
        exists: true,
        sizeBytes: 1024n,
        mimeType: 'image/jpeg',
      }),
    } as unknown as ObjectStorage;

    const usecase = new ConfirmUploadUseCase(files, storage);
    const result = await usecase.execute({
      organizationId: 'o1',
      userId: 'u1',
      fileId: 'f1',
    });
    expect(result.status).toBe('ready');
  });
});

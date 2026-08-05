import { describe, expect, it, vi } from 'vitest';
import {
  ConfirmUploadUseCase,
  CreateUploadUrlUseCase,
  DeleteFileUseCase,
  GetDownloadUrlUseCase,
  GetReadyFileUseCase,
} from './file.use-cases';
import type { FileRepository, ObjectStorage } from './ports/file.repository';
import type { AuthorizationService } from '../../rbac/application/rbac.use-cases';

function authzStub(overrides: Partial<AuthorizationService> = {}): AuthorizationService {
  return {
    assertPermissions: vi.fn().mockResolvedValue(undefined),
    hasPermission: vi.fn().mockResolvedValue(false),
    getGrants: vi.fn(),
    getPermissionKeys: vi.fn(),
    ...overrides,
  } as unknown as AuthorizationService;
}

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

    const usecase = new CreateUploadUrlUseCase(files, storage, authzStub());
    const result = await usecase.execute({
      organizationId: 'o1',
      userId: 'u1',
      originalFilename: 'a.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: '1024',
      purpose: 'member_photo',
    });

    expect(result.uploadUrl).toBe('https://upload');
    expect(files.create).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'private', mimeType: 'image/jpeg' }),
    );
  });

  it('requires cms.publish for cms uploads', async () => {
    const authz = authzStub({
      assertPermissions: vi.fn().mockRejectedValue({ code: 'FORBIDDEN' }),
    });
    const usecase = new CreateUploadUrlUseCase(
      { create: vi.fn() } as unknown as FileRepository,
      {
        driver: 'mock',
        defaultBucket: () => 'b',
        createUploadUrl: vi.fn(),
      } as unknown as ObjectStorage,
      authz,
    );
    await expect(
      usecase.execute({
        organizationId: 'o1',
        userId: 'u1',
        originalFilename: 'banner.png',
        mimeType: 'image/png',
        sizeBytes: '100',
        purpose: 'cms',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
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

  it('rejects missing storage object', async () => {
    const usecase = new ConfirmUploadUseCase(
      {
        findById: vi.fn().mockResolvedValue({
          id: 'f1',
          status: 'pending',
          uploadedByUserId: 'u1',
          bucket: 'b',
          objectKey: 'k',
          mimeType: 'image/jpeg',
          sizeBytes: '1024',
        }),
      } as unknown as FileRepository,
      {
        driver: 'mock',
        headObject: vi.fn().mockResolvedValue({ exists: false }),
      } as unknown as ObjectStorage,
    );
    await expect(
      usecase.execute({ organizationId: 'o1', userId: 'u1', fileId: 'f1' }),
    ).rejects.toMatchObject({ code: 'UPLOAD_MISSING' });
  });

  it('rejects confirm by non-uploader', async () => {
    const usecase = new ConfirmUploadUseCase(
      {
        findById: vi.fn().mockResolvedValue({
          id: 'f1',
          status: 'pending',
          uploadedByUserId: 'owner',
          bucket: 'b',
          objectKey: 'k',
          mimeType: 'image/jpeg',
          sizeBytes: '10',
        }),
      } as unknown as FileRepository,
      { driver: 'mock', headObject: vi.fn() } as unknown as ObjectStorage,
    );
    await expect(
      usecase.execute({ organizationId: 'o1', userId: 'other', fileId: 'f1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('GetDownloadUrlUseCase', () => {
  it('allows uploader to download private ready file', async () => {
    const files = {
      findById: vi.fn().mockResolvedValue({
        id: 'f1',
        status: 'ready',
        visibility: 'private',
        uploadedByUserId: 'u1',
        bucket: 'b',
        objectKey: 'orgs/o1/member_photo/2026/f1-a.jpg',
        originalFilename: 'a.jpg',
        purpose: 'member_photo',
      }),
    } as unknown as FileRepository;
    const storage = {
      driver: 'mock',
      createDownloadUrl: vi.fn().mockResolvedValue({
        url: 'https://dl',
        expiresAt: '2030-01-01T00:00:00.000Z',
      }),
    } as unknown as ObjectStorage;
    const usecase = new GetDownloadUrlUseCase(files, storage, authzStub());
    const result = await usecase.execute({
      organizationId: 'o1',
      userId: 'u1',
      fileId: 'f1',
    });
    expect(result.url).toBe('https://dl');
  });

  it('denies other users private downloads without manage permission', async () => {
    const usecase = new GetDownloadUrlUseCase(
      {
        findById: vi.fn().mockResolvedValue({
          id: 'f1',
          status: 'ready',
          visibility: 'private',
          uploadedByUserId: 'owner',
          bucket: 'b',
          objectKey: 'orgs/o1/member_photo/2026/f1-a.jpg',
          originalFilename: 'a.jpg',
          purpose: 'member_photo',
        }),
      } as unknown as FileRepository,
      { driver: 'mock', createDownloadUrl: vi.fn() } as unknown as ObjectStorage,
      authzStub(),
    );
    await expect(
      usecase.execute({ organizationId: 'o1', userId: 'other', fileId: 'f1' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('GetReadyFileUseCase', () => {
  it('enforces expected purpose', async () => {
    const usecase = new GetReadyFileUseCase({
      findById: vi.fn().mockResolvedValue({
        id: 'f1',
        status: 'ready',
        purpose: 'member_photo',
        objectKey: 'orgs/o1/member_photo/2026/f1-a.jpg',
      }),
    } as unknown as FileRepository);
    await expect(
      usecase.execute('o1', 'f1', { purposes: ['payment_evidence'] }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE_PURPOSE' });
  });
});

describe('DeleteFileUseCase', () => {
  it('allows uploader to soft-delete', async () => {
    const files = {
      findById: vi.fn().mockResolvedValue({
        id: 'f1',
        visibility: 'private',
        uploadedByUserId: 'u1',
        purpose: 'other',
        objectKey: 'orgs/o1/other/2026/f1-x.pdf',
      }),
      softDelete: vi.fn().mockResolvedValue(undefined),
    } as unknown as FileRepository;
    const usecase = new DeleteFileUseCase(files, authzStub());
    await expect(usecase.execute('o1', 'u1', 'f1')).resolves.toEqual({ ok: true });
    expect(files.softDelete).toHaveBeenCalledWith('o1', 'f1');
  });
});

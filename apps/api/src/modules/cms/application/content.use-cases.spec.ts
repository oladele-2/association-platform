import { describe, expect, it, vi } from 'vitest';
import {
  PublishContentUseCase,
  CreateContentUseCase,
  UnpublishContentUseCase,
  SubmitPublicContactUseCase,
} from './content.use-cases';
import type { ContentRepository } from './ports/content.repository';
import type { GetReadyFileUseCase } from '../../files/application/file.use-cases';
import type { EmailSender } from '../../identity/application/ports/email.sender';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('CreateContentUseCase', () => {
  it('rejects duplicate slug', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue({ id: '1', slug: 'about' }),
      create: vi.fn(),
    } as unknown as ContentRepository;
    const getReadyFile = { execute: vi.fn() } as unknown as GetReadyFileUseCase;
    const usecase = new CreateContentUseCase(repo, getReadyFile);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        type: 'page',
        slug: 'about',
        title: 'About',
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });

  it('validates cover file when provided', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'c1' }),
    } as unknown as ContentRepository;
    const getReadyFile = {
      execute: vi.fn().mockResolvedValue({ id: 'f1' }),
    } as unknown as GetReadyFileUseCase;
    const usecase = new CreateContentUseCase(repo, getReadyFile);
    await usecase.execute({
      organizationId: 'o1',
      type: 'news',
      slug: 'hello',
      title: 'Hello',
      coverFileId: 'f1',
    });
    expect(getReadyFile.execute).toHaveBeenCalledWith('o1', 'f1', {
      purposes: ['cms', 'branding'],
    });
  });
});

describe('PublishContentUseCase', () => {
  it('publishes draft content', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({
        id: 'c1',
        status: 'draft',
      }),
      publish: vi.fn().mockResolvedValue({ id: 'c1', status: 'published' }),
    } as unknown as ContentRepository;

    const usecase = new PublishContentUseCase(repo);
    const result = await usecase.execute('o1', 'c1');
    expect(result.status).toBe('published');
    expect(repo.publish).toHaveBeenCalledWith('o1', 'c1', expect.any(Date));
  });

  it('refuses archived content', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'c1', status: 'archived' }),
      publish: vi.fn(),
    } as unknown as ContentRepository;
    const usecase = new PublishContentUseCase(repo);
    await expect(usecase.execute('o1', 'c1')).rejects.toMatchObject({ code: 'CONTENT_ARCHIVED' });
  });
});

describe('UnpublishContentUseCase', () => {
  it('unpublishes published content', async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue({ id: 'c1', status: 'published' }),
      unpublish: vi.fn().mockResolvedValue({ id: 'c1', status: 'draft' }),
    } as unknown as ContentRepository;
    const usecase = new UnpublishContentUseCase(repo);
    await usecase.execute('o1', 'c1');
    expect(repo.unpublish).toHaveBeenCalledWith('o1', 'c1');
  });
});

describe('SubmitPublicContactUseCase', () => {
  it('requires configured inbox', async () => {
    const email = { send: vi.fn() } as unknown as EmailSender;
    const prisma = {
      asPlatform: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ organizationBranding: { findUnique: vi.fn().mockResolvedValue(null) } }),
      ),
    } as unknown as PrismaService;
    const usecase = new SubmitPublicContactUseCase(email, prisma);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        name: 'A',
        email: 'a@b.c',
        subject: 'Hi',
        body: 'Hello',
      }),
    ).rejects.toMatchObject({ code: 'CONTACT_NOT_CONFIGURED' });
    expect(email.send).not.toHaveBeenCalled();
  });

  it('sends when inbox is configured', async () => {
    const email = { send: vi.fn() } as unknown as EmailSender;
    const prisma = {
      asPlatform: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          organizationBranding: {
            findUnique: vi.fn().mockResolvedValue({ emailFromAddress: 'inbox@org.test' }),
          },
        }),
      ),
    } as unknown as PrismaService;
    const usecase = new SubmitPublicContactUseCase(email, prisma);
    await usecase.execute({
      organizationId: 'o1',
      name: 'A',
      email: 'a@b.c',
      subject: 'Hi',
      body: 'Hello',
    });
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'inbox@org.test',
        subject: '[Website contact] Hi',
      }),
    );
  });
});

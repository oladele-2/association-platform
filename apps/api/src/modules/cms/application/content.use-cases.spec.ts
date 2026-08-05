import { describe, expect, it, vi } from 'vitest';
import { PublishContentUseCase, CreateContentUseCase } from './content.use-cases';
import type { ContentRepository } from './ports/content.repository';

describe('CreateContentUseCase', () => {
  it('rejects duplicate slug', async () => {
    const repo = {
      findBySlug: vi.fn().mockResolvedValue({ id: '1', slug: 'about' }),
      create: vi.fn(),
    } as unknown as ContentRepository;
    const usecase = new CreateContentUseCase(repo);
    await expect(
      usecase.execute({
        organizationId: 'o1',
        type: 'page',
        slug: 'about',
        title: 'About',
      }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
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
});

import { DomainError } from '@association/shared-kernel';

export type ContentType =
  | 'page'
  | 'news'
  | 'blog'
  | 'circular'
  | 'download'
  | 'gallery_album'
  | 'executive'
  | 'past_executive'
  | 'committee';

export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PUBLIC_CONTENT_TYPES: readonly ContentType[] = [
  'page',
  'news',
  'blog',
  'circular',
  'download',
  'gallery_album',
  'executive',
  'past_executive',
];

export function assertContentSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 1 || normalized.length > 120 || !SLUG_RE.test(normalized)) {
    throw new DomainError('INVALID_SLUG', 'Slug must be lowercase letters, numbers, and hyphens');
  }
  return normalized;
}

export function assertCanPublish(status: ContentStatus): void {
  if (status === 'archived') {
    throw new DomainError('CONTENT_ARCHIVED', 'Archived content cannot be published');
  }
}

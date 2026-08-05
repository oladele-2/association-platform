import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { assertCanPublish, assertContentSlug, PUBLIC_CONTENT_TYPES } from './content.rules';

describe('content.rules', () => {
  it('normalizes slug', () => {
    expect(assertContentSlug('About-Us')).toBe('about-us');
  });

  it('rejects bad slugs', () => {
    expect(() => assertContentSlug('About Us')).toThrow(DomainError);
  });

  it('blocks publishing archived content', () => {
    expect(() => assertCanPublish('archived')).toThrow(DomainError);
  });

  it('covers website content types from the product list', () => {
    for (const type of [
      'page',
      'news',
      'download',
      'gallery_album',
      'executive',
      'past_executive',
    ] as const) {
      expect(PUBLIC_CONTENT_TYPES).toContain(type);
    }
  });
});

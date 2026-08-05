import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import {
  assertCanAccessOwnedOrManaged,
  assertChecksumSha256,
  assertPurpose,
  assertUploadConstraints,
  buildObjectKey,
  normalizeMimeType,
  purposeFromObjectKey,
  resolveVisibility,
  sanitizeFilename,
} from './file.rules';

describe('file.rules', () => {
  it('sanitizes filenames', () => {
    expect(sanitizeFilename('../../etc/passwd.jpg')).toBe('passwd.jpg');
    expect(sanitizeFilename('   ')).toBe('file');
  });

  it('builds tenant-scoped object keys', () => {
    const key = buildObjectKey({
      organizationId: 'o1',
      purpose: 'member_photo',
      fileId: 'f1',
      originalFilename: 'Me Photo!.jpg',
    });
    expect(key.startsWith('orgs/o1/member_photo/')).toBe(true);
    expect(key).toContain('f1-Me_Photo_.jpg');
  });

  it('rejects oversized photos', () => {
    expect(() =>
      assertUploadConstraints({
        purpose: 'member_photo',
        mimeType: 'image/jpeg',
        sizeBytes: BigInt(6 * 1024 * 1024),
      }),
    ).toThrow(DomainError);
  });

  it('rejects zero-byte uploads', () => {
    expect(() =>
      assertUploadConstraints({
        purpose: 'other',
        mimeType: 'application/pdf',
        sizeBytes: 0n,
      }),
    ).toThrow(DomainError);
  });

  it('rejects bad MIME for evidence', () => {
    expect(() =>
      assertUploadConstraints({
        purpose: 'payment_evidence',
        mimeType: 'application/zip',
        sizeBytes: 100n,
      }),
    ).toThrow(DomainError);
  });

  it('normalizes MIME with charset parameters', () => {
    expect(normalizeMimeType('Image/JPEG; charset=binary')).toBe('image/jpeg');
  });

  it('forces private visibility for sensitive purposes', () => {
    expect(resolveVisibility('member_photo', 'public')).toBe('private');
    expect(resolveVisibility('cms', 'public')).toBe('public');
  });

  it('parses purpose from object key', () => {
    expect(purposeFromObjectKey('orgs/o1/payment_evidence/2026/f1-a.pdf')).toBe('payment_evidence');
    expect(purposeFromObjectKey('bad')).toBeNull();
  });

  it('validates checksum digests', () => {
    expect(assertChecksumSha256(undefined)).toBeNull();
    expect(() => assertChecksumSha256('deadbeef')).toThrow(DomainError);
    expect(
      assertChecksumSha256('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
    ).toHaveLength(64);
  });

  it('denies private download for non-owners without manage', () => {
    expect(() =>
      assertCanAccessOwnedOrManaged({
        visibility: 'private',
        uploadedByUserId: 'owner',
        actorUserId: 'other',
        hasManagePermission: false,
        action: 'download',
      }),
    ).toThrow(DomainError);
  });

  it('rejects unknown purposes', () => {
    expect(() => assertPurpose('not-a-purpose')).toThrow(DomainError);
  });
});

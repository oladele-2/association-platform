import { describe, expect, it } from 'vitest';
import { DomainError } from '@association/shared-kernel';
import { assertUploadConstraints, buildObjectKey, sanitizeFilename } from './file.rules';

describe('file.rules', () => {
  it('sanitizes filenames', () => {
    expect(sanitizeFilename('../../etc/passwd.jpg')).toBe('passwd.jpg');
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

  it('rejects bad MIME for evidence', () => {
    expect(() =>
      assertUploadConstraints({
        purpose: 'payment_evidence',
        mimeType: 'application/zip',
        sizeBytes: 100n,
      }),
    ).toThrow(DomainError);
  });
});

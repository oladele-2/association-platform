import { DomainError } from '@association/shared-kernel';

export type FileStatus = 'pending' | 'ready' | 'deleted';
export type FileVisibility = 'private' | 'public';
export type FilePurpose =
  'member_photo' | 'payment_evidence' | 'receipt' | 'cms' | 'cme' | 'event' | 'branding' | 'other';

const PURPOSE_LIMITS: Record<FilePurpose, { maxBytes: number; mimeTypes: readonly string[] }> = {
  member_photo: {
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  payment_evidence: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  receipt: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  cms: {
    maxBytes: 20 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  },
  cme: {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
  event: {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
  branding: {
    maxBytes: 2 * 1024 * 1024,
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/svg+xml'],
  },
  other: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  },
};

export function assertPurpose(purpose: string): FilePurpose {
  if (!(purpose in PURPOSE_LIMITS)) {
    throw new DomainError('INVALID_FILE_PURPOSE', `Unknown file purpose: ${purpose}`);
  }
  return purpose as FilePurpose;
}

export function assertUploadConstraints(input: {
  purpose: FilePurpose;
  mimeType: string;
  sizeBytes: bigint;
}): void {
  const limits = PURPOSE_LIMITS[input.purpose];
  const mime = input.mimeType.trim().toLowerCase();
  if (!limits.mimeTypes.includes(mime)) {
    throw new DomainError('INVALID_MIME_TYPE', `MIME type not allowed for ${input.purpose}`);
  }
  if (input.sizeBytes <= 0n || input.sizeBytes > BigInt(limits.maxBytes)) {
    throw new DomainError(
      'FILE_TOO_LARGE',
      `File exceeds max size of ${limits.maxBytes} bytes for ${input.purpose}`,
    );
  }
}

export function assertCanConfirm(status: FileStatus): void {
  if (status !== 'pending') {
    throw new DomainError('FILE_NOT_PENDING', 'Only pending uploads can be confirmed');
  }
}

export function assertFileReady(status: FileStatus): void {
  if (status !== 'ready') {
    throw new DomainError('FILE_NOT_READY', 'File is not ready');
  }
}

export function sanitizeFilename(name: string): string {
  const base = name.trim().split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  return cleaned.length > 0 ? cleaned : 'file';
}

export function buildObjectKey(input: {
  organizationId: string;
  purpose: FilePurpose;
  fileId: string;
  originalFilename: string;
}): string {
  const year = new Date().getUTCFullYear();
  const safe = sanitizeFilename(input.originalFilename);
  return `orgs/${input.organizationId}/${input.purpose}/${year}/${input.fileId}-${safe}`;
}

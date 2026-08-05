import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type {
  OrganizationLookup,
  OrganizationLookupResult,
} from '../application/ports/organization-lookup';

type CacheEntry = { value: OrganizationLookupResult | null; expiresAt: number };

/** Short TTL in-memory cache for Host/slug → org (Redis optional later). */
@Injectable()
export class CachedPrismaOrganizationLookup implements OrganizationLookup {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async findByHostname(hostname: string): Promise<OrganizationLookupResult | null> {
    const key = `host:${hostname.toLowerCase()}`;
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const result = await this.prisma.asPlatform(async (tx) => {
      const domain = await tx.organizationDomain.findFirst({
        where: {
          hostname: { equals: hostname, mode: 'insensitive' },
          verifiedAt: { not: null },
          organization: { deletedAt: null },
        },
        select: {
          organization: {
            select: { id: true, slug: true, displayName: true, status: true },
          },
        },
      });
      return domain?.organization ?? null;
    });

    this.set(key, result);
    return result;
  }

  async findBySlug(slug: string): Promise<OrganizationLookupResult | null> {
    const key = `slug:${slug.toLowerCase()}`;
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const result = await this.prisma.asPlatform(async (tx) => {
      return tx.organization.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true, slug: true, displayName: true, status: true },
      });
    });

    this.set(key, result);
    return result;
  }

  /** Call after platform mutates org status/domains. */
  invalidateAll(): void {
    this.cache.clear();
  }

  private get(key: string): OrganizationLookupResult | null | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private set(key: string, value: OrganizationLookupResult | null): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

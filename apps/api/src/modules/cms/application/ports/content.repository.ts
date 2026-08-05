import type { ContentStatus, ContentType } from '../../domain/content.rules';

export type ContentView = {
  id: string;
  organizationId: string;
  type: ContentType;
  slug: string;
  title: string;
  subtitle: string | null;
  bodyMarkdown: string | null;
  bodyJson: unknown | null;
  excerpt: string | null;
  coverFileId: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageFileId: string | null;
  sortOrder: number;
  attributes: Record<string, unknown>;
  authorUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentListQuery = {
  organizationId: string;
  type?: ContentType;
  status?: ContentStatus;
  page?: number;
  limit?: number;
  publishedOnly?: boolean;
};

export type ContentListResult = {
  items: ContentView[];
  page: number;
  limit: number;
  total: number;
};

export type CreateContentInput = {
  organizationId: string;
  type: ContentType;
  slug: string;
  title: string;
  subtitle?: string | null;
  bodyMarkdown?: string | null;
  bodyJson?: unknown | null;
  excerpt?: string | null;
  coverFileId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageFileId?: string | null;
  sortOrder?: number;
  attributes?: Record<string, unknown>;
  authorUserId?: string | null;
  scheduledAt?: Date | null;
};

export type UpdateContentInput = {
  organizationId: string;
  id: string;
  title?: string;
  subtitle?: string | null;
  slug?: string;
  bodyMarkdown?: string | null;
  bodyJson?: unknown | null;
  excerpt?: string | null;
  coverFileId?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageFileId?: string | null;
  sortOrder?: number;
  attributes?: Record<string, unknown>;
  scheduledAt?: Date | null;
  status?: ContentStatus;
};

export interface ContentRepository {
  list(query: ContentListQuery): Promise<ContentListResult>;
  findById(organizationId: string, id: string): Promise<ContentView | null>;
  findBySlug(organizationId: string, type: ContentType, slug: string): Promise<ContentView | null>;
  create(input: CreateContentInput): Promise<ContentView>;
  update(input: UpdateContentInput): Promise<ContentView>;
  softDelete(organizationId: string, id: string): Promise<void>;
  publish(organizationId: string, id: string, at: Date): Promise<ContentView>;
  unpublish(organizationId: string, id: string): Promise<ContentView>;
}

export const CONTENT_REPOSITORY = Symbol('CONTENT_REPOSITORY');

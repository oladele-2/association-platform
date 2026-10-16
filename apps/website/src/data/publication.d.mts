export interface Publication {
  slug: string;
  title: string;
  summary: string;
  paragraphs: string[];
  publishedAt?: string;
  author?: string;
  startDate?: string;
  venue?: string;
}
export function selectPublications(
  snapshot: { tenant: string; articles: unknown[]; events: unknown[] },
  kind: 'articles' | 'events',
): Publication[];

import { tenant } from '../config/tenant';
import {
  demoCommittees,
  demoDownloads,
  demoEvents,
  demoExecutives,
  demoGallery,
  demoNews,
  demoPastExecutives,
  type Committee,
  type EventItem,
  type Executive,
  type NewsItem,
} from '../data/demo';

const slug = tenant.slug;

export type GalleryItem = { id: string; src: string; alt: string };
export type DownloadItem = { title: string; note: string; href?: string };

async function apiGet<T>(path: string): Promise<T | null> {
  const base = tenant.apiUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { 'X-Organization-Slug': slug },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function demoOrEmpty<T>(demo: T): T | [] {
  return tenant.useDemoFallback ? demo : ([] as unknown as T);
}

export async function getLatestNews(limit = 3): Promise<NewsItem[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=news&limit=${limit}`,
  );
  if (data?.items?.length) {
    return data.items.map(mapNews);
  }
  return demoOrEmpty(demoNews.slice(0, limit)) as NewsItem[];
}

export async function getNewsBySlug(newsSlug: string): Promise<NewsItem | null> {
  const data = await apiGet<Record<string, unknown>>(
    `/v1/public/content/by-slug?type=news&slug=${encodeURIComponent(newsSlug)}`,
  );
  if (data?.slug) return mapNews(data);
  if (!tenant.useDemoFallback) return null;
  return demoNews.find((n) => n.slug === newsSlug) ?? null;
}

export async function getAllNews(): Promise<NewsItem[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=news&limit=50`,
  );
  if (data?.items?.length) return data.items.map(mapNews);
  return (demoOrEmpty(demoNews) as NewsItem[]) ?? [];
}

export async function getUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const data = await apiGet<
    { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
  >(`/v1/public/events`);
  const items = Array.isArray(data) ? data : data?.items;
  if (items?.length) {
    return items.slice(0, limit).map(mapEvent);
  }
  return demoOrEmpty(demoEvents.slice(0, limit)) as EventItem[];
}

export async function getAllEvents(): Promise<EventItem[]> {
  const upcoming = await getUpcomingEvents(50);
  if (upcoming.length) return upcoming;
  return (demoOrEmpty(demoEvents) as EventItem[]) ?? [];
}

export async function getEventBySlug(eventSlug: string): Promise<EventItem | null> {
  const data = await apiGet<Record<string, unknown>>(
    `/v1/public/events/${encodeURIComponent(eventSlug)}`,
  );
  if (data?.slug) return mapEvent(data);
  if (!tenant.useDemoFallback) return null;
  return demoEvents.find((e) => e.slug === eventSlug) ?? null;
}

export async function getExecutives(): Promise<Executive[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=executive&limit=50`,
  );
  if (data?.items?.length) return data.items.map((item) => mapExecutive(item));
  return (demoOrEmpty(demoExecutives) as Executive[]) ?? [];
}

export async function getPastExecutives(): Promise<Executive[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=past_executive&limit=50`,
  );
  if (data?.items?.length) {
    return data.items.map((item) => mapExecutive(item, '/images/gallery-5.jpg'));
  }
  return (demoOrEmpty(demoPastExecutives) as Executive[]) ?? [];
}

export async function getCommittees(): Promise<Committee[]> {
  const data = await apiGet<
    Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }
  >(`/v1/public/committees`);
  const items = Array.isArray(data) ? data : data?.items;
  if (items?.length) {
    return items.map((item) => ({
      slug: String(item.slug ?? ''),
      name: String(item.name ?? ''),
      description: String(item.description ?? ''),
    }));
  }
  return (demoOrEmpty(demoCommittees) as Committee[]) ?? [];
}

export async function getCommitteeBySlug(committeeSlug: string): Promise<Committee | null> {
  const data = await apiGet<Record<string, unknown>>(
    `/v1/public/committees/${encodeURIComponent(committeeSlug)}`,
  );
  if (data?.slug) {
    return {
      slug: String(data.slug),
      name: String(data.name ?? ''),
      description: String(data.description ?? ''),
    };
  }
  if (!tenant.useDemoFallback) return null;
  return demoCommittees.find((c) => c.slug === committeeSlug) ?? null;
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=gallery_album&limit=50`,
  );
  if (data?.items?.length) {
    return data.items.map((item, index) => {
      const attrs = (item.attributes as Record<string, unknown>) ?? {};
      const src =
        String(attrs.src ?? attrs.coverUrl ?? item.excerpt ?? '') || tenant.images.meeting;
      return {
        id: String(item.id ?? item.slug ?? index),
        src,
        alt: String(item.title ?? attrs.alt ?? 'Gallery'),
      };
    });
  }
  return (demoOrEmpty(demoGallery) as GalleryItem[]) ?? [];
}

export async function getDownloads(): Promise<DownloadItem[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=download&limit=50`,
  );
  if (data?.items?.length) {
    return data.items.map((item) => {
      const attrs = (item.attributes as Record<string, unknown>) ?? {};
      return {
        title: String(item.title ?? ''),
        note: String(item.excerpt ?? attrs.note ?? ''),
        href: attrs.href ? String(attrs.href) : undefined,
      };
    });
  }
  return (demoOrEmpty(demoDownloads) as DownloadItem[]) ?? [];
}

function mapNews(item: Record<string, unknown>): NewsItem {
  return {
    slug: String(item.slug ?? ''),
    title: String(item.title ?? ''),
    excerpt: String(item.excerpt ?? item.summary ?? ''),
    publishedAt: String(item.publishedAt ?? item.createdAt ?? '').slice(0, 10),
    cover: String(
      (item.coverUrl as string) ||
        ((item.attributes as Record<string, string> | undefined)?.coverUrl ?? '') ||
        tenant.images.meeting,
    ),
    body: String(item.bodyMarkdown ?? item.body ?? ''),
  };
}

function mapEvent(item: Record<string, unknown>): EventItem {
  return {
    slug: String(item.slug ?? ''),
    title: String(item.title ?? ''),
    venue: String(item.venue ?? ''),
    startsAt: String(item.startsAt ?? ''),
    excerpt: String(item.description ?? '').slice(0, 160),
    cover: tenant.images.leadership,
  };
}

function mapExecutive(item: Record<string, unknown>, fallbackPhoto?: string): Executive {
  const attrs = (item.attributes as Record<string, string>) ?? {};
  return {
    name: String(item.title ?? attrs.name ?? ''),
    role: String(attrs.role_title ?? attrs.role ?? ''),
    photo: String(attrs.photoUrl ?? fallbackPhoto ?? tenant.images.logoSignage),
  };
}

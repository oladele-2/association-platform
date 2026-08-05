import { tenant } from '../config/tenant';
import {
  demoCommittees,
  demoEvents,
  demoExecutives,
  demoNews,
  demoPastExecutives,
  type Committee,
  type EventItem,
  type Executive,
  type NewsItem,
} from '../data/demo';

const slug = tenant.slug;

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

export async function getLatestNews(limit = 3): Promise<NewsItem[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=news&limit=${limit}`,
  );
  if (data?.items?.length) {
    return data.items.map((item) => ({
      slug: String(item.slug ?? ''),
      title: String(item.title ?? ''),
      excerpt: String(item.excerpt ?? item.summary ?? ''),
      publishedAt: String(item.publishedAt ?? item.createdAt ?? '').slice(0, 10),
      cover: String(
        (item.coverUrl as string) || (item.coverFileId ? '' : '') || '/images/meeting.jpg',
      ),
      body: String(item.bodyMarkdown ?? item.body ?? ''),
    }));
  }
  return demoNews.slice(0, limit);
}

export async function getNewsBySlug(newsSlug: string): Promise<NewsItem | null> {
  const data = await apiGet<Record<string, unknown>>(
    `/v1/public/content/by-slug?type=news&slug=${encodeURIComponent(newsSlug)}`,
  );
  if (data?.slug) {
    return {
      slug: String(data.slug),
      title: String(data.title ?? ''),
      excerpt: String(data.excerpt ?? ''),
      publishedAt: String(data.publishedAt ?? '').slice(0, 10),
      cover: '/images/meeting.jpg',
      body: String(data.bodyMarkdown ?? data.body ?? ''),
    };
  }
  return demoNews.find((n) => n.slug === newsSlug) ?? null;
}

export async function getAllNews(): Promise<NewsItem[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=news&limit=50`,
  );
  if (data?.items?.length) {
    return data.items.map((item) => ({
      slug: String(item.slug ?? ''),
      title: String(item.title ?? ''),
      excerpt: String(item.excerpt ?? ''),
      publishedAt: String(item.publishedAt ?? '').slice(0, 10),
      cover: '/images/meeting.jpg',
      body: String(item.bodyMarkdown ?? ''),
    }));
  }
  return demoNews;
}

export async function getUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const data = await apiGet<
    { items?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
  >(`/v1/public/events`);
  const items = Array.isArray(data) ? data : data?.items;
  if (items?.length) {
    return items.slice(0, limit).map((item) => ({
      slug: String(item.slug ?? ''),
      title: String(item.title ?? ''),
      venue: String(item.venue ?? ''),
      startsAt: String(item.startsAt ?? ''),
      excerpt: String(item.description ?? '').slice(0, 160),
      cover: '/images/leadership-meeting.jpg',
    }));
  }
  return demoEvents.slice(0, limit);
}

export async function getAllEvents(): Promise<EventItem[]> {
  const upcoming = await getUpcomingEvents(20);
  return upcoming.length ? upcoming : demoEvents;
}

export async function getEventBySlug(eventSlug: string): Promise<EventItem | null> {
  const data = await apiGet<Record<string, unknown>>(
    `/v1/public/events/${encodeURIComponent(eventSlug)}`,
  );
  if (data?.slug) {
    return {
      slug: String(data.slug),
      title: String(data.title ?? ''),
      venue: String(data.venue ?? ''),
      startsAt: String(data.startsAt ?? ''),
      excerpt: String(data.description ?? ''),
      cover: '/images/leadership-meeting.jpg',
    };
  }
  return demoEvents.find((e) => e.slug === eventSlug) ?? null;
}

export async function getExecutives(): Promise<Executive[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=executive&limit=50`,
  );
  if (data?.items?.length) {
    return data.items.map((item) => {
      const attrs = (item.attributes as Record<string, string>) ?? {};
      return {
        name: String(item.title ?? attrs.name ?? ''),
        role: String(attrs.role_title ?? attrs.role ?? ''),
        photo: '/images/logo-signage.jpeg',
      };
    });
  }
  return demoExecutives;
}

export async function getPastExecutives(): Promise<Executive[]> {
  const data = await apiGet<{ items?: Array<Record<string, unknown>> }>(
    `/v1/public/content?type=past_executive&limit=50`,
  );
  if (data?.items?.length) {
    return data.items.map((item) => {
      const attrs = (item.attributes as Record<string, string>) ?? {};
      return {
        name: String(item.title ?? attrs.name ?? ''),
        role: String(attrs.role_title ?? attrs.role ?? ''),
        photo: '/images/gallery-5.jpg',
      };
    });
  }
  return demoPastExecutives;
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
  return demoCommittees;
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
  return demoCommittees.find((c) => c.slug === committeeSlug) ?? null;
}

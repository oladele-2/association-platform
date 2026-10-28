import { bookAlbums } from '../data/photobook-content.mjs';
import { affiliateSeeds } from '../../vendor/website-content/affiliates.ts';
import { coreRoutes, site } from '../data/site';
import { articles, events } from '../data/editorial';
export function GET() {
  const paths = [
    ...coreRoutes,
    ...bookAlbums.map(album => `/gallery/${album.slug}`),
    ...affiliateSeeds.map(item => `/affiliates/${item.slug}`),
    ...(articles.some((article) => !article.reviewOnly) ? ['/news'] : []),
    ...articles.filter((article) => !article.reviewOnly).map((article) => `/news/${article.slug}`),
    ...events.filter((event) => !event.reviewOnly).map((event) => `/events/${event.slug}`),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${site.origin}${path === '/' ? '/' : path}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}

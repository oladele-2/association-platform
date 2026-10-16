import {
  validateSnapshot,
  uuidPattern,
  type PublicationSnapshot,
} from '@association/website-content';
import { escapeHtml, renderPublicationPage, entryPath } from '@association/website-content/render';
import localPublication from './content/release/snapshot.json';

type WebsiteEnv = Cloudflare.Env & {
  PUBLIC_RELEASE?: string;
  PORTAL?: { fetch(request: Request): Promise<Response> };
  WEBSITE_EXPORT_SECRET?: string;
};

const noStore = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
};
const allowedHosts = new Set(['nmaogun.com.ng', 'www.nmaogun.com.ng', '127.0.0.1', 'localhost']);
const baselineAlbums = new Set(['/gallery/meeting-life', '/gallery/doctors-house']);
export async function readSnapshot(response: Response): Promise<PublicationSnapshot> {
  if (!response.ok || !response.body) throw new Error('Publication service unavailable.');
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('Invalid publication response.');
  const maximum = 3 * 1024 * 1024,
    reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new Error('Publication response exceeds the size limit.');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return validateSnapshot(JSON.parse(new TextDecoder().decode(bytes)));
}
function serviceRequest(path: string, env: WebsiteEnv) {
  if (!env.WEBSITE_EXPORT_SECRET || env.WEBSITE_EXPORT_SECRET.length < 32)
    throw new Error('Publication service is not configured.');
  return new Request('https://portal.nmaogun.com.ng/api/website/' + path, {
    headers: { Authorization: 'Bearer ' + env.WEBSITE_EXPORT_SECRET },
    signal: AbortSignal.timeout(5000),
    redirect: 'manual',
  });
}
async function routeWebsiteRequest(
  request: Request,
  env: WebsiteEnv,
  publication: unknown = localPublication,
): Promise<Response> {
  const url = new URL(request.url);
  let path: string;
  try {
    path = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
  } catch {
    return new Response('Page not found.', { status: 404, headers: noStore });
  }
  if (/[\\%\u0000]/.test(path))
    return new Response('Page not found.', { status: 404, headers: noStore });
  if (!allowedHosts.has(url.hostname))
    return new Response('Unknown website host.', { status: 404, headers: noStore });
  if (!['GET', 'HEAD'].includes(request.method))
    return new Response('Method not allowed.', {
      status: 405,
      headers: { ...noStore, Allow: 'GET, HEAD' },
    });
  // Only the two public website hosts canonicalise; portal traffic is never accepted.
  if (
    url.hostname === 'www.nmaogun.com.ng' ||
    (url.hostname === 'nmaogun.com.ng' && url.protocol !== 'https:')
  ) {
    const canonical = new URL(url);
    canonical.protocol = 'https:';
    canonical.hostname = 'nmaogun.com.ng';
    canonical.port = '';
    return Response.redirect(canonical.href, 308);
  }
  if (path === '/robots.txt') {
    return new Response(
      env.PUBLIC_RELEASE === 'true'
        ? 'User-agent: *\nAllow: /\nSitemap: https://nmaogun.com.ng/sitemap.xml\n'
        : 'User-agent: *\nDisallow: /\n',
      {
        headers: { ...noStore, 'Content-Type': 'text/plain; charset=utf-8' },
      },
    );
  }
  if ((url.pathname.endsWith('/') && url.pathname !== '/') || path === '/home') {
    const canonical = new URL(url);
    canonical.pathname = path === '/home' ? '/' : url.pathname.replace(/\/+$/, '');
    return Response.redirect(canonical.href, 308);
  }
  if (
    path === '/publication-shell' ||
    path.startsWith('/publication-shell/') ||
    path.startsWith('/api/') ||
    path.startsWith('/_publication') ||
    path.startsWith('/_review')
  )
    return new Response('Page not found.', { status: 404, headers: noStore });
  if (path.startsWith('/media/')) {
    const id = path.slice('/media/'.length);
    if (!uuidPattern.test(id) || url.search)
      return new Response('Media not found.', { status: 404, headers: noStore });
    try {
      const localSnapshot = env.PORTAL ? undefined : validateSnapshot(publication);
      const media = localSnapshot?.media.find(
        (item) =>
          item.id === id &&
          localSnapshot.entries.some((entry) => entry.content.mediaIds.includes(id)),
      );
      if (!env.PORTAL && !media)
        return new Response('Media not found.', { status: 404, headers: noStore });
      const upstream = env.PORTAL
        ? await env.PORTAL.fetch(serviceRequest('media/' + id, env))
        : await env.ASSETS.fetch(new Request(new URL('/_publication/' + id, url.origin)));
      if (!upstream.ok) {
        await upstream.body?.cancel();
        return new Response(
          upstream.status === 404 ? 'Media not found.' : 'Media temporarily unavailable.',
          { status: upstream.status === 404 ? 404 : 503, headers: noStore },
        );
      }
      const mime = media?.mime ?? upstream.headers.get('content-type') ?? '';
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mime)) {
        await upstream.body?.cancel();
        throw new Error('Invalid media type.');
      }
      const headers = new Headers(noStore);
      headers.set('Content-Type', mime);
      headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
      const disposition = media
        ? `${media.mime === 'application/pdf' ? 'attachment' : 'inline'}; filename="${media.filename.replace(/[^a-zA-Z0-9._-]/g, '-')}"`
        : upstream.headers.get('content-disposition');
      if (disposition) headers.set('Content-Disposition', disposition);
      if (request.method === 'HEAD') {
        await upstream.body?.cancel();
        return new Response(null, { headers });
      }
      return new Response(upstream.body, { headers });
    } catch {
      return new Response('Media temporarily unavailable.', { status: 503, headers: noStore });
    }
  }
  const managed =
    /^\/(news|events|leadership|resources)(\/|$)/.test(path) ||
    (path.startsWith('/gallery/') && !baselineAlbums.has(path));
  const htmlPage =
    managed ||
    [
      '/',
      '/about',
      '/membership',
      '/programmes',
      '/gallery',
      '/privacy',
      '/accessibility',
      '/sitemap.xml',
    ].includes(path);
  if (!htmlPage) return env.ASSETS.fetch(request);
  let snapshot: PublicationSnapshot;
  try {
    snapshot = env.PORTAL
      ? await readSnapshot(await env.PORTAL.fetch(serviceRequest('export', env)))
      : validateSnapshot(publication);
  } catch {
    console.error(JSON.stringify({ event: 'website_publication_unavailable', path }));
    if (managed)
      return new Response(
        'This section is temporarily unavailable. Please return to the homepage and try again later.',
        { status: 503, headers: { ...noStore, 'Retry-After': '30' } },
      );
    return env.ASSETS.fetch(request);
  }
  if (path === '/sitemap.xml') {
    const asset = await env.ASSETS.fetch(new Request(new URL('/sitemap.xml', url.origin)));
    const xml = await asset.text();
    const paths = new Set(
      snapshot.entries.flatMap((entry) => [
        entryPath(entry).split('#')[0]!,
        entry.kind === 'article'
          ? '/news'
          : entry.kind === 'officer'
            ? '/leadership'
            : entry.kind === 'resource'
              ? '/resources'
              : entry.kind === 'event'
                ? '/programmes'
                : '/gallery',
      ]),
    );
    const additions = [...paths]
      .filter((path) => !xml.includes(`<loc>https://nmaogun.com.ng${path}</loc>`))
      .map((path) => `<url><loc>https://nmaogun.com.ng${escapeHtml(path)}</loc></url>`)
      .join('');
    return new Response(
      request.method === 'HEAD' ? null : xml.replace('</urlset>', additions + '</urlset>'),
      { headers: { ...noStore, 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }
  const page = renderPublicationPage(path, snapshot);
  if (managed && !page)
    return new Response('Page not found. Return to the NMA Ogun homepage.', {
      status: 404,
      headers: noStore,
    });
  const shellUrl = new URL(page ? '/publication-shell' : url.pathname, url.origin);
  const asset = await env.ASSETS.fetch(new Request(shellUrl, { method: 'GET' }));
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  for (const [key, value] of Object.entries(noStore)) headers.set(key, value);
  headers.delete('Content-Length');
  headers.delete('ETag');
  const response = new Response(asset.body, { status: asset.status, headers });
  let rewriter = new HTMLRewriter();
  if (page) {
    rewriter = rewriter
      .on('title', {
        element(element) {
          element.setInnerContent(page.title + ' — NMA Ogun');
        },
      })
      .on(
        'meta[name="description"],meta[property="og:description"],meta[name="twitter:description"]',
        {
          element(element) {
            element.setAttribute('content', page.description);
          },
        },
      )
      .on('meta[property="og:title"],meta[name="twitter:title"]', {
        element(element) {
          element.setAttribute('content', page.title + ' — NMA Ogun');
        },
      })
      .on('meta[name="robots"]', {
        element(element) {
          if (env.PUBLIC_RELEASE === 'true')
            element.setAttribute('content', 'index,follow,max-image-preview:large');
        },
      })
      .on('link[rel="canonical"]', {
        element(element) {
          element.setAttribute('href', 'https://nmaogun.com.ng' + path);
        },
      })
      .on('meta[property="og:url"]', {
        element(element) {
          element.setAttribute('content', 'https://nmaogun.com.ng' + path);
        },
      })
      .on('[data-publication-content]', {
        element(element) {
          element.setInnerContent(page.html, { html: true });
        },
      });
  }
  const links = [
    ['article', '/news', 'News & media'],
    ['officer', '/leadership', 'Leadership'],
    ['resource', '/resources', 'Resources'],
  ].filter(([kind]) => snapshot.entries.some((entry) => entry.kind === kind));
  rewriter = rewriter
    .on('#site-navigation a', {
      element(element) {
        const href = element.getAttribute('href');
        if (
          href &&
          (path === href ||
            path.startsWith(href + '/') ||
            (href === '/programmes' && path.startsWith('/events/')))
        )
          element.setAttribute('aria-current', 'page');
      },
    })
    .on('#site-navigation a.button', {
      element(element) {
        for (const [, href, label] of links)
          element.before(
            `<a href="${escapeHtml(href)}"${path.startsWith(href!) ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`,
            { html: true },
          );
      },
    });
  const transformed = rewriter.transform(response);
  if (request.method === 'HEAD') {
    await transformed.body?.cancel();
    return new Response(null, { status: transformed.status, headers: transformed.headers });
  }
  return transformed;
}
export async function handleWebsiteRequest(
  request: Request,
  env: WebsiteEnv,
  publication: unknown = localPublication,
): Promise<Response> {
  const response = await routeWebsiteRequest(request, env, publication);
  const headers = new Headers(response.headers);
  // Keep Cloudflare's automatic analytics injection out of this standalone site.
  if ((headers.get('Content-Type') ?? '').includes('text/html'))
    headers.set('Cache-Control', (headers.get('Cache-Control') ?? 'no-store, max-age=0') + ', no-transform');
  if (
    env.PUBLIC_RELEASE === 'true' &&
    response.ok &&
    /text\/html|application\/xml/.test(headers.get('Content-Type') ?? '')
  ) {
    headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large');
  } else if (response.status >= 400) headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (!headers.has('Content-Security-Policy'))
    headers.set(
      'Content-Security-Policy',
      "base-uri 'self'; frame-ancestors 'none'; object-src 'none'",
    );
  if (response.ok && new URL(request.url).pathname.startsWith('/_astro/'))
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  fetch(request, env) {
    return handleWebsiteRequest(request, env);
  },
} satisfies ExportedHandler<Cloudflare.Env>;

import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.resolve('wrangler'));
const { Miniflare, NoOpLog, convertV4MiniflareOptions } = require('miniflare');
const { build } = require('esbuild');
const app = resolve(import.meta.dirname, '..');
const id = randomUUID(),
  mediaId = randomUUID();
const photo = await readFile(join(app, 'src/assets/community-meeting.jpg'));
const content = {
  slug: 'fixture-story',
  title: 'Standalone <story>',
  summary: 'Local fixture.',
  paragraphs: ['A reviewed publication.'],
  author: 'Fixture office',
  date: '2026-01-01',
  mediaIds: [mediaId],
};
const snapshot = {
  schemaVersion: 1,
  tenant: 'nmaogun',
  generation: '1',
  entries: [{ id, kind: 'article', revision: 1, publishedAt: '2026-01-01T00:00:00Z', content }],
  media: [
    {
      id: mediaId,
      mime: 'image/jpeg',
      alt: 'Fixture photograph',
      filename: 'fixture.jpg',
      bytes: photo.length,
    },
  ],
};
const empty = { ...snapshot, generation: '2', entries: [], media: [] };
async function assets(request) {
  let path = decodeURIComponent(new URL(request.url).pathname);
  if (path === '/_publication/' + mediaId) return new Response(photo);
  if (path === '/') path = '/index.html';
  else if (!extname(path)) path += '/index.html';
  try {
    const types = { '.html': 'text/html', '.xml': 'application/xml' };
    return new Response(await readFile(join(app, 'dist', path)), {
      headers: { 'Content-Type': types[extname(path)] ?? 'application/octet-stream' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
async function runtime(script) {
  return new Miniflare(
    convertV4MiniflareOptions({
      name: 'standalone-test',
      modules: true,
      script,
      compatibilityDate: '2026-10-15',
      compatibilityFlags: ['nodejs_compat'],
      log: new NoOpLog(),
      bindings: { PUBLIC_RELEASE: 'true' },
      // Deliberately no portal binding, database, bucket, or secret.
      serviceBindings: { ASSETS: assets },
    }),
  );
}
async function fixtureScript(publication) {
  const result = await build({
    stdin: {
      contents: `import { handleWebsiteRequest } from './worker.ts';
      export default { fetch(request, env) { return handleWebsiteRequest(request, env, ${JSON.stringify(publication)}); } };`,
      resolveDir: app,
      sourcefile: 'standalone-fixture.ts',
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
  });
  return result.outputFiles[0].text;
}

for (const mode of ['bundle', 'published', 'withdrawn', 'invalid']) {
  const script =
    mode === 'bundle'
      ? await readFile(resolve(app, '../../tmp/website-worker-bundle/worker.js'), 'utf8')
      : await fixtureScript(
          mode === 'published'
            ? snapshot
            : mode === 'withdrawn'
              ? empty
              : { ...snapshot, tenant: 'other' },
        );
  const mf = await runtime(script);
  const get = (path, options) => mf.dispatchFetch('https://nmaogun.com.ng' + path, options);
  try {
    let canonical = await mf.dispatchFetch('https://www.nmaogun.com.ng/about?source=fixture', {
      redirect: 'manual',
    });
    assert.equal(canonical.status, 308);
    assert.equal(canonical.headers.get('location'), 'https://nmaogun.com.ng/about?source=fixture');
    await canonical.text();
    for (const [source, target] of [
      ['/about/', '/about'],
      ['/home/', '/'],
      ['/home', '/'],
    ]) {
      canonical = await get(source, { redirect: 'manual' });
      assert.equal(canonical.status, 308);
      assert.equal(canonical.headers.get('location'), 'https://nmaogun.com.ng' + target);
      await canonical.text();
    }
    let response = await get('/');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.match(response.headers.get('x-robots-tag'), /^index, follow/);
    const home = await response.text();
    const robots = await get('/robots.txt');
    assert.match(await robots.text(), /Allow: \/\nSitemap:/);
    if (mode === 'published') assert.match(home, /href="\/news"/);
    response = await get('/news/fixture-story');
    assert.equal(response.status, mode === 'published' ? 200 : mode === 'invalid' ? 503 : 404);
    const html = await response.text();
    if (mode === 'published') {
      assert.match(html, /Standalone &lt;story&gt;/);
      assert.match(html, /A reviewed publication/);
      assert.match(html, /name="robots" content="index,follow,max-image-preview:large"/);
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
      assert.match(html, /canonical" href="https:\/\/nmaogun.com.ng\/news\/fixture-story/);
    }
    assert.match(response.headers.get('cache-control'), /no-store/);
    response = await get('/media/' + mediaId);
    assert.equal(response.status, mode === 'published' ? 200 : mode === 'invalid' ? 503 : 404);
    if (mode === 'published') {
      assert.equal(response.headers.get('content-type'), 'image/jpeg');
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
    } else await response.text();
    response = await get('/sitemap.xml');
    assert.equal(response.status, 200);
    const sitemap = await response.text();
    assert.equal(sitemap.includes('/news/fixture-story'), mode === 'published');
    for (const path of [
      '/publication-shell',
      '/_publication/' + mediaId,
      '/api/website/export',
      '/review',
    ]) {
      response = await get(path);
      assert.equal(response.status, 404);
      await response.text();
    }
    response = await get('/news/fixture-story', { method: 'HEAD' });
    assert.equal(await response.text(), '');
    response = await get('/', { method: 'POST' });
    assert.equal(response.status, 405);
    await response.text();
    response = await mf.dispatchFetch('https://other.example/');
    assert.equal(response.status, 404);
    await response.text();
  } finally {
    await mf.dispose();
  }
}
console.log(
  'Standalone Worker checks passed: actual bundle, publication rendering, media, metadata, sitemap, withdrawal, invalid scope, private paths, HEAD and unknown hosts; no portal or secrets.',
);

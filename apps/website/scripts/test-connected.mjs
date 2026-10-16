import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.resolve('wrangler'));
const { Miniflare, NoOpLog, convertV4MiniflareOptions } = require('miniflare');
const app = resolve(import.meta.dirname, '..');
const secret = 'local-fixture-secret-for-runtime-tests-only';
const articleId = randomUUID(),
  imageId = randomUUID();
const fixturePhoto = await readFile(join(app, 'src/assets/community-meeting.jpg'));
const content = {
  slug: 'fixture-story',
  title: 'Fixture news <test>',
  summary: 'A local integration fixture.',
  paragraphs: ['A reviewed fixture paragraph.'],
  author: 'Fixture office',
  date: '2026-01-01',
  venue: '',
  office: '',
  term: '',
  group: 'current',
  mediaIds: [imageId],
  sortOrder: 0,
};
const snapshot = {
  schemaVersion: 1,
  tenant: 'nmaogun',
  generation: '1',
  entries: [
    { id: articleId, kind: 'article', revision: 3, publishedAt: '2026-01-01T00:00:00Z', content },
  ],
  media: [
    {
      id: imageId,
      mime: 'image/jpeg',
      alt: 'Fixture image',
      filename: 'fixture.jpg',
      bytes: fixturePhoto.byteLength,
    },
  ],
};
let mode = 'published';
const contentTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const mf = new Miniflare(
  convertV4MiniflareOptions({
    name: 'website-test',
    port: process.argv.includes('--preview') ? 4326 : 0,
    modules: true,
    script: await readFile(resolve(app, '../../tmp/website-worker-bundle/worker.js'), 'utf8'),
    compatibilityDate: '2026-09-10',
    compatibilityFlags: ['nodejs_compat'],
    log: new NoOpLog(),
    bindings: { WEBSITE_EXPORT_SECRET: secret },
    serviceBindings: {
      PORTAL: async (request) => {
        assert.equal(request.headers.get('authorization'), 'Bearer ' + secret);
        const url = new URL(request.url);
        assert.equal(url.hostname, 'portal.nmaogun.com.ng');
        assert.equal(url.search, '');
        if (mode === 'failure') return new Response('Unavailable', { status: 503 });
        if (url.pathname.includes('/media/'))
          return mode === 'withdrawn'
            ? new Response('Not found', { status: 404 })
            : new Response(fixturePhoto, { headers: { 'Content-Type': 'image/jpeg' } });
        return Response.json(
          mode === 'withdrawn'
            ? { ...snapshot, generation: '2', entries: [], media: [] }
            : mode === 'other'
              ? { ...snapshot, tenant: 'other' }
              : snapshot,
        );
      },
      ASSETS: async (request) => {
        let path = decodeURIComponent(new URL(request.url).pathname);
        if (path === '/') path = '/index.html';
        else if (!extname(path)) path += '/index.html';
        try {
          return new Response(await readFile(join(app, 'dist', path)), {
            headers: { 'Content-Type': contentTypes[extname(path)] ?? 'application/octet-stream' },
          });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      },
    },
  }),
);
try {
  const get = (path) => mf.dispatchFetch('https://nmaogun.com.ng' + path);
  let response = await get('/news/fixture-story');
  assert.equal(response.status, 200);
  let html = await response.text();
  assert.match(html, /Fixture news &lt;test&gt;/);
  assert.match(html, /A reviewed fixture paragraph/);
  assert.match(html, /<h1>/);
  assert.ok(!html.includes(secret));
  assert.match(response.headers.get('cache-control'), /no-store/);
  response = await get('/');
  assert.match(await response.text(), /href="\/news"/);
  response = await get('/media/' + imageId);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  await response.arrayBuffer();
  response = await get('/%6eews/fixture-story');
  assert.equal(response.status, 200);
  await response.text();
  mode = 'withdrawn';
  response = await get('/news/fixture-story');
  assert.equal(response.status, 404);
  await response.text();
  response = await get('/media/' + imageId);
  assert.equal(response.status, 404);
  await response.text();
  mode = 'failure';
  response = await get('/news/fixture-story');
  assert.equal(response.status, 503);
  await response.text();
  response = await get('/');
  assert.equal(response.status, 200);
  await response.text();
  mode = 'other';
  response = await get('/news/fixture-story');
  assert.equal(response.status, 503);
  await response.text();
  response = await mf.dispatchFetch('https://another.example/news/fixture-story');
  assert.equal(response.status, 404);
  await response.text();
  response = await get('/publication-shell');
  assert.equal(response.status, 404);
  await response.text();
  console.log(
    'Connected Worker checks passed: rendering, scoped service authentication, navigation, withdrawal, media revocation, failure handling and unknown hosts.',
  );
  if (process.argv.includes('--preview')) {
    mode = 'published';
    console.log('Local connected website fixture: ' + (await mf.ready).href);
    await new Promise((resolve) => {
      process.once('SIGINT', resolve);
      process.once('SIGTERM', resolve);
    });
  }
} finally {
  await mf.dispose();
}

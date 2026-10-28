import assert from 'node:assert/strict';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const app = resolve(import.meta.dirname, '..');
const origin = process.argv[2] ?? 'http://127.0.0.1:4325';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Run this prelaunch check against a local standalone Worker.');
const routes = [
  '/',
  '/about',
  '/executives',
  '/committees',
  '/membership',
  '/programmes',
  '/gallery',
  '/gallery/meeting-life',
  '/gallery/doctors-house',
  '/privacy',
  '/accessibility',
];
const results = [];
for (const path of [
  ...routes,
  '/missing-page-audit',
  '/news',
  '/resources',
  '/review',
  '/publication-shell',
  '/_publication/blocked',
]) {
  const response = await fetch(origin + path, { redirect: 'manual' });
  assert.equal(response.status, routes.includes(path) ? 200 : 404, path);
  const html = await response.text();
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  assert.equal(response.headers.get('x-frame-options'), 'DENY', path);
  if (routes.includes(path) || path === '/missing-page-audit') {
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, path);
    assert.match(
      html,
      routes.includes(path) ? /index,follow,max-image-preview:large/ : /noindex,nofollow/,
      path,
    );
    assert.match(html, /id="main" tabindex="-1"/, path);
    assert.ok(gzipSync(html).byteLength <= 24 * 1024, path + ' exceeds HTML budget');
    for (const match of html.matchAll(/<(?:img|script|link)\b[^>]*(?:src|href)="(https?:[^" ]+)"/g))
      assert.ok(
        !/fonts\.googleapis|googletagmanager|google-analytics|facebook/.test(match[1]),
        'Unexpected external dependency',
      );
  }
  results.push({ path, status: response.status, gzipBytes: gzipSync(html).byteLength });
}
for (const [path, destination] of [
  ['/home/', '/'],
  ['/home', '/'],
  ['/about/', '/about'],
  ['/gallery/meeting-life/', '/gallery/meeting-life'],
]) {
  const response = await fetch(origin + path + '?source=launch-check', { redirect: 'manual' });
  assert.equal(response.status, 308, path);
  assert.equal(
    response.headers.get('location'),
    origin + destination + '?source=launch-check',
    path,
  );
  await response.body?.cancel();
  const final = await fetch(origin + destination);
  assert.equal(final.status, 200, path + ' redirect destination');
  await final.body?.cancel();
}
const home = await readFile(join(app, 'dist/index.html'), 'utf8');
const asset = home.match(/src="(\/_astro\/[^" ]+)"/)[1];
const response = await fetch(origin + asset);
assert.match(response.headers.get('cache-control'), /max-age=31536000, immutable/);
await response.body?.cancel();
const fonts = await readdir(join(app, 'public/fonts'));
let fontBytes = 0;
for (const name of fonts.filter((name) => name.endsWith('.woff2')))
  fontBytes += (await readFile(join(app, 'public/fonts', name))).byteLength;
assert.ok(fontBytes < 80 * 1024, 'Font budget exceeded');
const scripts = [...home.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
const scriptBytes = Buffer.byteLength(scripts.map((match) => match[1]).join(''));
assert.ok(scriptBytes < 8 * 1024, 'Client script budget exceeded');
const report = {
  checkedAt: new Date().toISOString(),
  origin,
  routes: results,
  redirects: 'passed',
  cacheHeaders: 'passed',
  fontBytes,
  scriptBytes,
  htmlGzipBudget: 24 * 1024,
};
const output = resolve(app, 'tmp/website-launch');
await mkdir(output, { recursive: true });
await writeFile(join(output, 'http-budget-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

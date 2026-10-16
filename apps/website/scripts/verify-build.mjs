import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, relative, extname } from 'node:path';
import assert from 'node:assert/strict';

const app = resolve(import.meta.dirname, '..');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name),
      ),
    )
  ).flat();
}
const reviewOnly = [
  'review',
  'leadership',
  'leadership/past',
  'committees',
  'affiliates',
  'contact',
  'resources',
  'news',
  'news/article-layout',
  'events/programme-layout',
];
for (const directory of ['dist', 'dist-review']) {
  const root = join(app, directory);
  const files = await walk(root);
  const htmlFiles = files.filter((file) => extname(file) === '.html');
  let checkedLinks = 0;
  for (const file of files)
    assert.ok(
      !/\.(xlsx|pdf|ttf)$/i.test(file),
      `Internal/unoptimised asset in ${relative(root, file)}`,
    );
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const page = relative(root, file)
      .replaceAll('\\', '/')
      .replace(/index\.html$/, '')
      .replace(/\/$/, '');
    assert.match(
      html,
      directory === 'dist-review' || /404|publication-shell/.test(page)
        ? /<meta name="robots" content="noindex,nofollow"/
        : /<meta name="robots" content="index,follow,max-image-preview:large"/,
    );
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${page}: expected one h1`);
    assert.match(html, /<link rel="canonical" href="https:\/\/nmaogun\.com\.ng/);
    assert.ok(
      !/gamil\.com|nmaogunstate@gmail|Kareem Yesiru|Auditor|2026-10-20|2026-10-22|tenants\//i.test(
        html,
      ),
      `${page}: held content leaked`,
    );
    assert.ok(
      !/resources\/|apps\/webapp\/|\.xlsx|\.pdf|IHSOSA|FT All Stars/.test(html),
      `${page}: internal/other-tenant source leaked`,
    );
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const value = match[1].replaceAll('&amp;', '&');
      if (/^(https?:|mailto:|tel:|data:)/.test(value)) {
        if (value.startsWith('https://portal.'))
          assert.match(
            value,
            /^https:\/\/portal\.nmaogun\.com\.ng\/(login|register|forgot-password)$/,
          );
        continue;
      }
      if (!value.startsWith('/') && !value.startsWith('#')) continue;
      const url = new URL(value, `http://local/${page ? `${page}/` : ''}`);
      const path = decodeURIComponent(url.pathname).replace(/^\//, '');
      let target = join(root, path);
      try {
        if ((await stat(target)).isDirectory()) target = join(target, 'index.html');
      } catch {
        target = join(root, path, 'index.html');
      }
      const content = await readFile(target);
      if (url.hash) {
        const id = decodeURIComponent(url.hash.slice(1));
        assert.ok(content.toString().includes(`id="${id}"`), `${page}: missing anchor ${value}`);
      }
      checkedLinks++;
    }
  }
  if (directory === 'dist') {
    for (const route of reviewOnly)
      assert.ok(!files.includes(join(root, route, 'index.html')), `Review route leaked: ${route}`);
    for (const file of htmlFiles) {
      const html = await readFile(file, 'utf8');
      assert.ok(
        !/Dr Enimola|Bajomo Olutope|Layout specimen|Programme candidate/.test(html),
        'Review data in normal build',
      );
    }
    assert.ok(
      !files.some((file) => /enimola|bajomo|ogunjimi|osikoya/i.test(file)),
      'Review portrait in normal build',
    );
  } else {
    for (const route of reviewOnly)
      assert.ok(files.includes(join(root, route, 'index.html')), `Missing review route: ${route}`);
  }
  console.log(
    `${directory}: ${htmlFiles.length} HTML pages, ${checkedLinks} local links/assets checked; publication holds preserved.`,
  );
}

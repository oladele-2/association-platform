import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { affiliateSeeds } from "../vendor/website-content/affiliates.ts";
import { validateSnapshot } from "../vendor/website-content/index.ts";
import { renderPublicationPage } from "../vendor/website-content/render.ts";

const dist = resolve(import.meta.dirname, "../dist");
const routes = [
  "/affiliates",
  ...affiliateSeeds.map((profile) => `/affiliates/${profile.slug}`),
];
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const publication = validateSnapshot(JSON.parse(await readFile(join(dist, '_publication/snapshot.json'), 'utf8')));
for (const route of routes) {
  const html = await readFile(join(dist, route, "index.html"), "utf8");
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, route);
  assert.ok(
    html.includes(`rel="canonical" href="https://nmaogun.com.ng${route}"`),
    route,
  );
  assert.ok(
    sitemap.includes(`<loc>https://nmaogun.com.ng${route}</loc>`),
    route,
  );
  assert.ok(gzipSync(html).byteLength < 24 * 1024, route + " HTML budget");
  assert.doesNotMatch(
    html,
    /tenants\/|OTHER|privateMemberData|Website preview ·/,
  );
  for (const [, href] of html.matchAll(/href="([^"<>]+)"/g)) {
    if (href.startsWith("#")) {
      assert.ok(
        html.includes(`id="${href.slice(1)}"`),
        `${route}: missing ${href}`,
      );
    } else if (href.startsWith("/") && !href.startsWith("//")) {
      const path = href.split(/[?#]/)[0];
      if (/^\/(news|events|executives|resources)(\/|$)/.test(path) || (path.startsWith('/gallery/') && publication.entries.some(entry => entry.kind === 'gallery' && path === '/gallery/' + entry.content.slug))) {
        assert.ok(renderPublicationPage(path, publication), `${route}: unavailable publication link ${path}`);
      } else {
        await access(join(dist, path, path.includes(".") ? "" : "index.html"));
      }
    }
  }
  for (const [, src] of html.matchAll(
    /<img\b[^>]*src="(\/images\/affiliates\/[^"<>]+)"/g,
  )) {
    await access(join(dist, src));
  }
}
const directory = await readFile(join(dist, "affiliates/index.html"), "utf8");
assert.equal((directory.match(/class="affiliate-card"/g) ?? []).length, 17);
assert.match(directory, /data-category-filter/);
assert.match(directory, /data-directory-empty hidden/);
assert.equal(
  (directory.match(/<img src="\/images\/affiliates\//g) ?? []).length,
  17,
);
assert.doesNotMatch(directory, /<span class="affiliate-monogram"/);
console.log(
  "Verified 18 affiliate pages: directory, all 17 profiles, canonical metadata, sitemap, local links, anchors and HTML budgets.",
);

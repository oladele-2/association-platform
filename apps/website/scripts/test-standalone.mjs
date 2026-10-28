import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { physiciansWeekState } from '../src/data/resource-features.mjs';

import { book, bookAlbums, curatedPages } from '../src/data/photobook-content.mjs';
import stories from '../src/data/photobook-stories.json' with {type:'json'};

const require = createRequire(import.meta.resolve("wrangler"));
const { Miniflare, NoOpLog, convertV4MiniflareOptions } = require("miniflare");
const { build } = require("esbuild");
const app = resolve(import.meta.dirname, "..");
const bundledPublication = JSON.parse(await readFile(join(app, "content/release/snapshot.json"), "utf8"));
const bundledArticles = bundledPublication.entries.filter((entry) => entry.kind === "article");
const firstBundledOfficer = bundledPublication.entries.find((entry) => entry.kind === 'officer');
const escaped = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const id = randomUUID(),
  mediaId = randomUUID();
const photo = await readFile(join(app, "src/assets/community-meeting.jpg"));
const content = {
  slug: "fixture-story",
  title: "Standalone <story>",
  summary: "Local fixture.",
  paragraphs: ["A reviewed publication."],
  author: "Fixture office",
  date: "2026-01-01",
  mediaIds: [mediaId],
};
const snapshot = {
  schemaVersion: 1,
  tenant: "nmaogun",
  generation: "1",
  entries: [
    {
      id,
      kind: "article",
      revision: 1,
      publishedAt: "2026-01-01T00:00:00Z",
      content,
    },
  ],
  media: [
    {
      id: mediaId,
      mime: "image/jpeg",
      alt: "Fixture photograph",
      filename: "fixture.jpg",
      bytes: photo.length,
    },
  ],
};
const affiliateDetails = {
  code: "MWAN",
  category: "Professional associations",
  location: "Ogun State",
  tagline: "Approved affiliate tagline",
  featuredMembers: [
    { name: "Dr Fixture Member", specialty: "Family Medicine" },
  ],
  memberListingApproved: true,
  focusAreas: ["Professional connection"],
  sections: [
    { heading: "Leadership", paragraphs: ["Reviewed local leadership."] },
  ],
  contactEmail: "public@example.invalid",
  contactPhone: "",
  address: "",
  website: "https://example.invalid",
};
snapshot.entries.push({
  id: randomUUID(),
  kind: "officer",
  revision: 1,
  publishedAt: "2026-01-01T00:00:00Z",
  content: {
    slug: "fixture-chairman", title: "Dr Fixture Chairman", summary: "Approved replacement chairman.",
    paragraphs: [], office: "Chairman", term: "2026–2028", group: "current", mediaIds: [mediaId],
  },
});
snapshot.entries.push({
  id: randomUUID(),
  kind: "affiliate",
  revision: 1,
  publishedAt: "2026-01-01T00:00:00Z",
  content: {
    slug: "mwan",
    title: "Reviewed MWAN profile",
    summary: "Approved affiliate introduction.",
    paragraphs: ["Approved affiliate narrative."],
    mediaIds: [],
    affiliate: affiliateDetails,
  },
});
const empty = { ...snapshot, generation: "2", entries: [], media: [] };
async function assets(request) {
  let path = decodeURIComponent(new URL(request.url).pathname);
  if (path === "/_publication/" + mediaId) return new Response(photo);
  if (path === "/") path = "/index.html";
  else if (!extname(path) && !path.startsWith("/_publication/")) path += "/index.html";
  try {
    const types = {
      ".html": "text/html",
      ".xml": "application/xml",
      ".pdf": "application/pdf",
      ".webp": "image/webp",
    };
    return new Response(await readFile(join(app, "dist", path)), {
      headers: {
        "Content-Type": types[extname(path)] ?? "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
async function runtime(script) {
  return new Miniflare(
    convertV4MiniflareOptions({
      name: "standalone-test",
      modules: true,
      script,
      compatibilityDate: "2026-10-15",
      compatibilityFlags: ["nodejs_compat"],
      log: new NoOpLog(),
      bindings: { PUBLIC_RELEASE: "true" },
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
      sourcefile: "standalone-fixture.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  return result.outputFiles[0].text;
}

for (const mode of ["bundle", "published", "withdrawn", "invalid"]) {
  const script =
    mode === "bundle"
      ? await readFile(
          resolve(app, "tmp/website-worker-bundle/worker.js"),
          "utf8",
        )
      : await fixtureScript(
          mode === "published"
            ? snapshot
            : mode === "withdrawn"
              ? empty
              : { ...snapshot, tenant: "other" },
        );
  const mf = await runtime(script);
  const get = (path, options) =>
    mf.dispatchFetch("https://nmaogun.com.ng" + path, options);
  try {
    let canonical = await mf.dispatchFetch(
      "https://www.nmaogun.com.ng/about?source=fixture",
      {
        redirect: "manual",
      },
    );
    assert.equal(canonical.status, 308);
    assert.equal(
      canonical.headers.get("location"),
      "https://nmaogun.com.ng/about?source=fixture",
    );
    await canonical.text();
    for (const [source, target] of [
      ["/about/", "/about"],
      ["/home/", "/"],
      ["/home", "/"],
      ["/leadership", "/executives"],
    ]) {
      canonical = await get(source, { redirect: "manual" });
      assert.equal(canonical.status, 308);
      assert.equal(
        canonical.headers.get("location"),
        "https://nmaogun.com.ng" + target,
      );
      await canonical.text();
    }
    let response = await get("/");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.match(response.headers.get("x-robots-tag"), /^index, follow/);
    const home = await response.text();
    if (mode === 'bundle') {
      assert.equal((home.match(/<figure\b[^>]*\bdata-slide(?:\s|>)/g) ?? []).length, 9, 'Nine slideshow panels');
      assert.match(home, /Doctors and fellow worshippers seated at the Physicians/, 'Real church photograph has descriptive alternative text');
      assert.doesNotMatch(home, /Illustration of Nigerian doctors|slide4-illustration/);
      assert.match(home, /name="q"/, 'Homepage article search passes its query');
      assert.match(home, /mailto:nmaogunstate@gmail.com/, 'Public Secretariat email');
      assert.equal(home.includes('id="physicians-feature-title"'), physiciansWeekState() !== 'past', 'Expired week feature is not shown');
      for (const marker of ['id="member-benefits-title"', 'id="committee-feature-title"', 'id="affiliate-feature-title"', 'href="/history"', 'href="/newsletter"']) assert.ok(home.includes(marker), marker);
      assert.equal((home.match(/class="affiliate-logo-card"/g) ?? []).length, 3);
      const nav = home.match(/<nav id="site-navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
      assert.equal((nav.match(/href="\/news"/g) ?? []).length, bundledArticles.length ? 1 : 0, 'News navigation is not duplicated');
      const homepageLinks = new Set([...home.matchAll(/<a\b[^>]*href="(\/[^"#?]*)(?:#[^"]*)?"/g)].map(match => match[1]));
      for (const path of homepageLinks) {
        const linked = await get(path);
        assert.equal(linked.status, 200, 'Homepage link: ' + path);
        await linked.body?.cancel();
      }
      const slideSources = [...home.matchAll(/<figure\b[^>]*data-slide[^>]*>\s*<img\b[^>]*src="([^"]+)"/g)].map(match => match[1]);
      assert.equal(slideSources.length, 9);
      for (const path of slideSources) {
        const image = await get(path);
        assert.equal(image.status, 200, 'Slideshow image: ' + path);
        assert.match(image.headers.get('content-type'), /image\/webp/);
        assert.ok((await image.arrayBuffer()).byteLength > 1000);
      }
      for (const path of ['/contact', '/programmes/year-ahead', '/physicians-week-2026', '/history', '/newsletter', '/gallery/physicians-week-thanksgiving-2026']) {
        const page = await get(path);
        assert.equal(page.status, 200, path);
        const text = await page.text();
        assert.equal((text.match(/<h1[ >]/g) ?? []).length, 1, path + ': one page heading');
        assert.match(text, /nmaogunstate@gmail.com/, path + ': Secretariat contact');
        if (path.endsWith('year-ahead')) {
          assert.match(text, /Proposed programme/);
          assert.equal((text.match(/class="programme-month"/g) ?? []).length, 12);
          assert.ok(!text.includes('Format to be confirmed'), 'September workshop format has been sourced');
        }
        if (path === '/physicians-week-2026') {
          assert.equal((text.match(/<time datetime="2026-10-/g) ?? []).length, 7);
          assert.match(text, /Scientific conference \/ Ordinary General Meeting/);
          assert.doesNotMatch(text, /\b(?:14:00|2pm|2 pm)\b/);
        }
        if (path === '/history') {
          assert.equal((text.match(/<th scope="row">/g) ?? []).length, 20);
          assert.match(text, /Not recorded in this selection/);
          assert.doesNotMatch(text, /(?:\+234|\b0[789]\d{9}\b|tel:)/);
        }
        if (path === '/newsletter') {
          assert.match(text, /Archived call · Closed/);
          assert.match(text, /4–30 September 2026/);
          if (!bundledPublication.entries.some(entry => entry.kind === 'resource' && /\b(newsletter|bulletin)\b/i.test(entry.content.title))) assert.match(text, /Published newsletter editions will appear here when available/);
        }
      }
      const committees = await get('/committees');
      const committeeHtml = await committees.text();
      for (const anchor of ['training-cme', 'health-policy-doctors-welfare', 'research-and-publications']) assert.ok(committeeHtml.includes(`id="${anchor}"`), anchor);
      const originalArchive = await get('/resources/PAST%20EXECUTIVES%20-%20Sheet1.pdf');
      assert.equal(originalArchive.status, 404, 'Unredacted source PDF is not published');
      await originalArchive.body?.cancel();
    }
    for (const [path, marker] of [["/executives", mode === "published" ? "Dr Fixture Chairman" : mode === "bundle" ? firstBundledOfficer ? escaped(firstBundledOfficer.content.title.replace(/^Dr\.?\s*/i, '')) : "Executive information is being updated." : "Executive information is being updated."], ["/committees", "Dr Kunle Farayibi"]]) {
      const roster = await get(path);
      const expected = path === "/executives" && mode === "invalid" ? 503 : 200;
      assert.equal(roster.status, expected, path);
      const rosterHtml = await roster.text();
      if (expected === 200) {
        assert.match(roster.headers.get("x-robots-tag"), /^index, follow/);
        assert.ok(rosterHtml.includes(marker), path);
        assert.equal((rosterHtml.match(/<h1[ >]/g) ?? []).length, 1, path);
        assert.equal(rosterHtml.includes('href="/news"'), mode === "published" || (mode === "bundle" && bundledArticles.length > 0), `${path}: publication navigation`);
      }
      if (path === "/executives" && mode !== "bundle") {
        assert.ok(!rosterHtml.includes("Dr Enimola Sunday"), "Never restore a static roster after withdrawal or replacement");
        assert.equal(rosterHtml.includes("Dr Fixture Chairman"), mode === "published");
      }
      const head = await get(path, { method: "HEAD" });
      assert.equal(head.status, expected, path);
      assert.equal(await head.text(), "", path);
    }
    const oldPortrait = await get("/images/executives/enimola-sunday.webp");
    assert.equal(oldPortrait.status, 404, "Old public portrait URLs must be removed");
    await oldPortrait.text();
    if (mode === "bundle") {
      assert.equal(bookAlbums.length, 8);
      assert.equal(curatedPages.length, 58);
      assert.ok(!curatedPages.includes(46) && !curatedPages.includes(48));
      for (const path of ['/photobook', ...bookAlbums.map(a => '/gallery/' + a.slug)]) {
        const page = await get(path);
        assert.equal(page.status, 200, path);
        const html = await page.text();
        assert.match(html, /photobook/);
        assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, path);
      }
      const pdf = await get(book.pdf);
      assert.equal(pdf.status, 200);
      assert.match(pdf.headers.get('content-type'), /application\/pdf/);
      assert.doesNotMatch(pdf.headers.get('content-security-policy'), /object-src|sandbox|default-src/);
      assert.match(pdf.headers.get('content-disposition'), /^inline;/);
      assert.equal((await pdf.arrayBuffer()).byteLength, book.pdfBytes);
      assert.ok(book.pdfBytes < 25 * 1024 * 1024);
      for (const story of stories) {
        if (!bundledArticles.some(a => a.content.slug === story.slug)) continue;
        const article = await get('/news/' + story.slug);
        assert.equal(article.status, 200);
        const html = await article.text();
        assert.ok(html.includes('/photobook/images/page-' + String(story.pages[0]).padStart(2,'0') + '.webp'));
      }
      const manifest = await get('/publication-status.json');
      assert.equal(manifest.status, 200);
      assert.match(manifest.headers.get('cache-control'), /no-store/);
      const metadata = await manifest.json();
      assert.deepEqual(metadata.entries, bundledPublication.entries.map(entry => ({ id: entry.id, revision: entry.revision })));
      assert.ok(!JSON.stringify(metadata).includes('WEBSITE_EXPORT_SECRET'));
      const raw = await get('/_publication/snapshot.json');
      assert.equal(raw.status, 404);
      await raw.text();
      const listing = await get("/news");
      assert.equal(listing.status, bundledArticles.length ? 200 : 404);
      const listingHtml = await listing.text();
      if (bundledArticles.length) {
        assert.ok(listingHtml.includes('role="search"'), "Article search landmark");
        assert.ok(listingHtml.includes('data-directory-search="article-results"'), "Search targets the article list");
        assert.ok(listingHtml.includes('data-clear-search'), "Readers can clear a search");
        assert.ok(listingHtml.includes('data-directory-empty hidden'), "No-results message starts hidden");
      }
      for (const entry of bundledArticles) {
        const path = "/news/" + entry.content.slug;
        assert.ok(listingHtml.includes(`href="${path}"`), path + ": listed");
        assert.ok(listingHtml.includes(`data-search-text="${escaped([entry.content.title, entry.content.summary, entry.content.author, ...entry.content.paragraphs].join(' '))}"`), path + ": searchable public content is escaped");
        const article = await get(path);
        assert.equal(article.status, 200, path);
        const html = await article.text();
        assert.ok(html.includes(escaped(entry.content.paragraphs[0])), path + ": body");
        assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, path);
        if (entry.content.slug === 'electronic-medical-records-nigeria-doctors-digital-clinical-practice') {
          assert.match(html, /Ajirdiipo Limited/);
          assert.doesNotMatch(html, /Contributor disclosure/);
          assert.match(html, /Editorial note:/);
          assert.match(html, /<title>Electronic Medical Records in Nigeria: What Doctors Should Know \| NMA Ogun<\/title>/);
          assert.match(html, /<h2>Patient identification is fundamental/);
          const previous = await get('/news/preparing-ogun-hospitals-for-digital-practice?source=shared', { redirect: 'manual' });
          assert.equal(previous.status, 308);
          assert.ok(previous.headers.get('location').endsWith(entry.content.slug + '?source=shared'));
          assert.equal((html.match(/rel="sponsored noopener noreferrer"/g) ?? []).length, 1);
          assert.match(html, />AjirMed’s comparison of EMR systems for Nigerian hospitals/);
        }
      }
      const issue = await get('/newsletter/2026-third-edition');
      assert.equal(issue.status, 200);
      const issueHtml = await issue.text();
      assert.match(issueHtml, /Biannual/i);
      for (const entry of bundledArticles.filter(entry => entry.content.slug.startsWith('newsletter-'))) assert.ok(issueHtml.includes('/news/' + entry.content.slug), entry.content.slug);
      for (const path of ['/research', '/facilities']) {
        const page = await get(path);
        assert.equal(page.status, 200, path);
        assert.equal(((await page.text()).match(/<h1[ >]/g) ?? []).length, 1);
      }
      const galleries = await get('/gallery');
      assert.ok((await galleries.text()).includes('/gallery/meeting-life'));
      for (const item of bundledPublication.media) {
        const media = await get("/media/" + item.id);
        assert.equal(media.status, 200, "Bundled publication portrait");
        if (item.mime === 'application/pdf') {
          assert.doesNotMatch(media.headers.get('content-security-policy'), /sandbox|default-src|object-src/, 'Native PDF reader must not be blocked');
          assert.match(media.headers.get('content-security-policy'), /frame-ancestors 'none'/);
          assert.match(media.headers.get('content-disposition'), /^inline;/);
          assert.equal(media.headers.get('content-type'), 'application/pdf');
          assert.ok(item.bytes < 8 * 1024 * 1024);
        }
        assert.equal((await media.arrayBuffer()).byteLength, item.bytes);
        const direct = await get("/_publication/" + item.id);
        assert.equal(direct.status, 404, "Raw release media remains protected");
        await direct.text();
      }
    }
    for (const path of ["/about", "/accessibility", "/membership", "/gallery/meeting-life"]) {
      const result = await get(path);
      assert.equal(result.status, 200, path);
      assert.equal((await result.text()).includes('href="/news"'), mode === "published" || (mode === "bundle" && bundledArticles.length > 0), `${path}: publication navigation`);
    }
    const logo = await get("/images/affiliates/ard-fmc-abeokuta.webp");
    assert.equal(logo.status, 200);
    assert.ok((await logo.arrayBuffer()).byteLength > 0);
    const robots = await get("/robots.txt");
    assert.match(await robots.text(), /Allow: \/\nSitemap:/);
    if (mode === "published") assert.match(home, /href="\/news"/);
    response = await get("/news/fixture-story");
    assert.equal(
      response.status,
      mode === "published" ? 200 : mode === "invalid" ? 503 : 404,
    );
    const html = await response.text();
    if (mode === "published") {
      assert.match(html, /Standalone &lt;story&gt;/);
      assert.match(html, /A reviewed publication/);
      assert.match(
        html,
        /name="robots" content="index,follow,max-image-preview:large"/,
      );
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
      assert.match(
        html,
        /canonical" href="https:\/\/nmaogun.com.ng\/news\/fixture-story/,
      );
    }
    assert.match(response.headers.get("cache-control"), /no-store/);
    response = await get("/media/" + mediaId);
    assert.equal(
      response.status,
      mode === "published" ? 200 : mode === "invalid" ? 503 : 404,
    );
    if (mode === "published") {
      assert.equal(response.headers.get("content-type"), "image/jpeg");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
    } else await response.text();
    for (const path of [
      "/affiliates",
      "/affiliates/mwan",
      "/affiliates/ard-fmc-abk",
      "/affiliates/nda-ogun",
    ]) {
      response = await get(path);
      assert.equal(response.status, mode === "invalid" ? 503 : 200, path);
      const affiliateHtml = await response.text();
      if (mode !== "invalid") {
        assert.equal((affiliateHtml.match(/<h1[ >]/g) ?? []).length, 1, path);
        assert.match(affiliateHtml, /canonical/);
        if (path === "/affiliates/mwan") {
          assert.equal(
            affiliateHtml.includes("Approved affiliate narrative."),
            mode === "published",
          );
          assert.equal(
            affiliateHtml.includes("public@example.invalid"),
            mode === "published",
          );
          assert.equal(
            affiliateHtml.includes("Reviewed local leadership."),
            mode === "published",
          );
          assert.equal(
            affiliateHtml.includes("Dr Fixture Member"),
            mode === "published",
          );
        }
      }
    }
    response = await get("/affiliates/unknown-affiliate");
    assert.equal(response.status, mode === "invalid" ? 503 : 404);
    await response.text();
    response = await get("/affiliates/mwan", { method: "HEAD" });
    assert.equal(await response.text(), "");
    response = await get("/sitemap.xml");
    assert.equal(response.status, 200);
    const sitemap = await response.text();
    assert.equal(sitemap.includes("/news/fixture-story"), mode === "published");
    for (const path of [
      "/publication-shell",
      "/_publication/" + mediaId,
      "/api/website/export",
      "/review",
    ]) {
      response = await get(path);
      assert.equal(response.status, 404);
      await response.text();
    }
    response = await get("/news/fixture-story", { method: "HEAD" });
    assert.equal(await response.text(), "");
    response = await get("/", { method: "POST" });
    assert.equal(response.status, 405);
    await response.text();
    response = await mf.dispatchFetch("https://other.example/");
    assert.equal(response.status, 404);
    await response.text();
  } finally {
    await mf.dispose();
  }
}
console.log(
  "Standalone Worker checks passed: actual bundle, publication rendering, media, metadata, sitemap, withdrawal, invalid scope, private paths, HEAD and unknown hosts; no portal or secrets.",
);

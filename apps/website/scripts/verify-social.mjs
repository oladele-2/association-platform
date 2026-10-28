import { assertPublicCrawlingAllowed } from './robots-check.mjs';
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkedFetch } from "./check-fetch.mjs";
const origin =
  process.argv.slice(2).find((arg) => !arg.startsWith("--")) ??
  "https://nmaogun.com.ng";
if (!(
  origin === "https://nmaogun.com.ng" ||
  /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
))
  throw new Error("Use the website production or local origin.");
const agent =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
async function get(path) {
  const response = await checkedFetch(origin + path, {
    headers: { "User-Agent": agent },
    redirect: "manual",
    signal: AbortSignal.timeout(25000),
  });
  return response;
}
const pages = [];
const publication = JSON.parse(await readFile(new URL(process.argv.includes('--live-release') ? "../dist/_publication/snapshot.json" : "../content/release/snapshot.json", import.meta.url), "utf8"));
const articles = publication.entries.filter((entry) => entry.kind === "article");
const details = publication.entries.filter((entry) => ['article', 'event', 'gallery'].includes(entry.kind));
for (const path of [
  "/",
  "/about",
  "/membership",
  "/programmes",
  "/programmes/year-ahead",
  "/contact",
  "/physicians-week-2026",
  "/history",
  "/newsletter",
  "/gallery",
  "/gallery/physicians-week-thanksgiving-2026",
  "/gallery/meeting-life",
  "/gallery/doctors-house",
  "/privacy",
  "/accessibility",
  ...(articles.length ? ["/news"] : []),
  ...(publication.entries.some(entry => entry.kind === 'resource') ? ['/resources'] : []),
  ...details.map(entry => `/${entry.kind === 'article' ? 'news' : entry.kind === 'event' ? 'events' : 'gallery'}/${entry.content.slug}`),
]) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /noindex/);
  const html = await response.text();
  const meta = Object.fromEntries(
    [
      ...html.matchAll(
        /<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]*)"/g,
      ),
    ].map((m) => [m[1], m[2]]),
  );
  for (const key of [
    "og:title",
    "og:description",
    "og:url",
    "og:type",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
    "twitter:card",
    "twitter:image",
  ])
    assert.ok(meta[key], path + ": " + key);
  assert.equal(
    meta["og:url"],
    "https://nmaogun.com.ng" + (path === "/" ? "/" : path),
  );
  assert.equal(
    meta["og:image"],
    "https://nmaogun.com.ng/social/nma-ogun-share.png",
  );
  assert.equal(meta["og:image:width"], "1200");
  assert.equal(meta["og:image:height"], "630");
  assert.equal(meta["twitter:card"], "summary_large_image");
  assert.doesNotMatch(meta.robots, /noindex/);
  assert.ok(!html.includes("Website preview ·"));
  pages.push({
    path,
    status: response.status,
    title: meta["og:title"],
    image: meta["og:image"],
  });
}
let response = await get("/social/nma-ogun-share.png");
assert.equal(response.status, 200);
assert.match(response.headers.get("content-type"), /image\/png/);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(bytes.subarray(1, 4).toString(), "PNG");
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 630);
assert.ok(bytes.length < 1024 * 1024);
response = await get("/robots.txt");
const robots = await response.text();
assertPublicCrawlingAllowed(robots);
const report = {
  dnsSource: process.argv.includes("--public-dns")
    ? "public DNS (1.1.1.1 / 8.8.8.8), TLS verified normally"
    : "system resolver",
  checkedAt: new Date().toISOString(),
  origin,
  userAgent: agent,
  pages,
  image: { status: 200, width: 1200, height: 630, bytes: bytes.length },
  robots: "allowed",
  facebookDebugger:
    "Separate authenticated Meta debugger result required; this is a crawler/metadata check only.",
};
const output = resolve(import.meta.dirname, "../tmp/social-check.json");
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));

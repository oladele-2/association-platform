import { bookAlbums } from '../src/data/photobook-content.mjs';
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkedFetch } from "./check-fetch.mjs";
const origin = "https://nmaogun.com.ng";
const snapshot = JSON.parse(await readFile(new URL(process.argv.includes('--live-release') ? "../dist/_publication/snapshot.json" : "../content/release/snapshot.json", import.meta.url), "utf8"));
const articles = snapshot.entries.filter((entry) => entry.kind === "article");
const details = snapshot.entries.filter((entry) => ['article', 'event', 'gallery'].includes(entry.kind));
const detailPath = (entry) => `/${entry.kind === 'article' ? 'news' : entry.kind === 'event' ? 'events' : 'gallery'}/${entry.content.slug}`;
const hasResources = snapshot.entries.some((entry) => entry.kind === 'resource');
const escaped = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const results = [];
async function check(url, status, options = {}) {
  const response = await checkedFetch(url, { redirect: "manual", ...options });
  assert.equal(response.status, status, url);
  results.push({ url, status: response.status });
  return response;
}
for (const path of [
  "/",
  "/about",
  "/executives",
  "/committees",
  "/membership",
  "/programmes",
  "/programmes/year-ahead",
  "/contact",
  "/physicians-week-2026",
  "/history",
  "/newsletter",
  "/gallery",
  "/photobook",
  ...bookAlbums.map(a => "/gallery/" + a.slug),
  "/gallery/physicians-week-thanksgiving-2026",
  "/gallery/meeting-life",
  "/gallery/doctors-house",
  "/privacy",
  "/accessibility",
  ...(articles.length ? ["/news"] : []),
  ...(hasResources ? ['/resources'] : []),
  ...details.map(detailPath),
]) {
  const response = await check(origin + path, 200);
  assert.match(response.headers.get("x-robots-tag"), /^index/);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const html = await response.text();
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.ok(
    html.includes(
      'rel="canonical" href="' + origin + (path === "/" ? "/" : path) + '"',
    ),
  );
  assert.doesNotMatch(
    html,
    /Website preview ·|Layout specimen|gamil\.com|tenants\//,
  );
  const externalResources = [
    ...html.matchAll(/<(?:img|script)[^>]+src="https?:[^>]+>/g),
  ].map((match) => match[0]);
  assert.equal(externalResources.length, 0, JSON.stringify(externalResources));
  const asset = html.match(/src="(\/_astro\/[^" ]+)"/)[1];
  const assetResponse = await check(origin + asset, 200);
  assert.match(
    assetResponse.headers.get("cache-control"),
    /max-age=31536000.*immutable/,
  );
  await assetResponse.body?.cancel();
}
for (const path of [
  "/missing-launch-check",
  "/review",
  ...(articles.length ? [] : ["/news"]),
  ...(hasResources ? [] : ['/resources']),
  "/publication-shell",
  "/_publication/blocked",
  "/api/website/export",
]) {
  const response = await check(origin + path, 404);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  await response.body?.cancel();
}
for (const [url, destination] of [
  [origin + "/home/?source=launch", origin + "/?source=launch"],
  [origin + "/about/?source=launch", origin + "/about?source=launch"],
  [
    origin + "/gallery/meeting-life/?source=launch",
    origin + "/gallery/meeting-life?source=launch",
  ],
  [
    "https://www.nmaogun.com.ng/about?source=launch",
    origin + "/about?source=launch",
  ],
]) {
  const response = await check(url, 308);
  assert.equal(response.headers.get("location"), destination);
  await response.body?.cancel();
}
let response = await checkedFetch("http://nmaogun.com.ng/about?source=launch", {
  redirect: "manual",
});
assert.ok([301, 308].includes(response.status));
assert.equal(response.headers.get("location"), origin + "/about?source=launch");
results.push({
  url: "http://nmaogun.com.ng/about?source=launch",
  status: response.status,
});
await response.body?.cancel();
response = await check(origin + "/sitemap.xml", 200);
const sitemap = await response.text();
assert.match(sitemap, /<loc>https:\/\/nmaogun\.com\.ng\/about<\/loc>/);
assert.doesNotMatch(sitemap, /<loc>https:\/\/nmaogun\.com\.ng\/(?:review|leadership)(?:\/|<)/);
assert.ok(sitemap.includes(`<loc>${origin}/contact</loc>`));
assert.ok(sitemap.includes(`<loc>${origin}/programmes/year-ahead</loc>`));
for (const entry of details) {
  assert.ok(sitemap.includes(`<loc>${origin}${detailPath(entry)}</loc>`), entry.content.slug);
  const article = await check(origin + detailPath(entry), 200);
  const html = await article.text();
  assert.ok(html.includes(escaped(entry.content.title)), entry.content.slug);
  if (entry.content.paragraphs.length) assert.ok(html.includes(escaped(entry.content.paragraphs[0])), entry.content.slug + ": publication body");
}
response = await check(origin + "/", 200, { method: "HEAD" });
assert.equal(await response.text(), "");
response = await check(origin + "/", 405, { method: "POST" });
await response.body?.cancel();
for (const path of ["/login", "/register", "/forgot-password"]) {
  response = await check("https://portal.nmaogun.com.ng" + path, 200);
  await response.body?.cancel();
}
const report = {
  checkedAt: new Date().toISOString(),
  dnsSource: process.argv.includes("--public-dns")
    ? "public DNS, normal TLS validation"
    : "system DNS",
  results,
  authenticatedPortalJourneys:
    "not tested; no member test credentials supplied",
  enquiries: "Public Secretariat email and Contact page; no submission endpoint",
};
await mkdir(resolve(import.meta.dirname, "../tmp"), { recursive: true });
await writeFile(
  resolve(import.meta.dirname, "../tmp/public-check.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));

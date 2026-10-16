// Read-only launch inventory. Credentials remain in memory and are never reported.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
let account = process.env.CLOUDFLARE_ACCOUNT_ID;
const output = resolve(import.meta.dirname, '../../../tmp/website-phase5/infrastructure.json');
let token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  const config = await readFile(
    join(process.env.APPDATA, 'xdg.config/.wrangler/config/default.toml'),
    'utf8',
  );
  token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
}
if (!token) throw new Error('Cloudflare authentication unavailable. Run wrangler whoami.');
async function get(path) {
  const response = await fetch('https://api.cloudflare.com/client/v4/' + path, {
    headers: { Authorization: 'Bearer ' + token },
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok || !body.success)
    return {
      status: response.status,
      errors: body.errors?.map((e) => ({ code: e.code, message: e.message })),
    };
  return body.result;
}
const report = { checkedAt: new Date().toISOString(), mode: 'read-only', zones: [] };
if (!account) {
  const accounts = await get('accounts?per_page=50');
  if (Array.isArray(accounts) && accounts.length === 1) account = accounts[0].id;
}
for (const name of ['nmaogun.com.ng', 'nmaogun.org.ng']) {
  const zones = await get('zones?name=' + name);
  if (!Array.isArray(zones)) {
    report.zones.push({ name, lookup: zones });
    continue;
  }
  if (!zones.length) {
    report.zones.push({ name, accessible: false });
    continue;
  }
  for (const zone of zones) {
    const dns = await get(`zones/${zone.id}/dns_records?per_page=100`);
    const routes = await get(`zones/${zone.id}/workers/routes`);
    report.zones.push({
      name,
      status: zone.status,
      nameservers: zone.name_servers,
      dns: Array.isArray(dns)
        ? dns
            .filter((r) => ['A', 'AAAA', 'CNAME', 'NS'].includes(r.type))
            .map((r) => ({ type: r.type, name: r.name, content: r.content, proxied: r.proxied }))
        : dns,
      routes: Array.isArray(routes)
        ? routes.map((r) => ({ pattern: r.pattern, script: r.script }))
        : routes,
    });
  }
}
const domains = account
  ? await get(`accounts/${account}/workers/domains`)
  : { skipped: 'Set CLOUDFLARE_ACCOUNT_ID to select an account.' };
report.customDomains = Array.isArray(domains)
  ? domains
      .filter((d) => /nmaogun/.test(d.hostname))
      .map((d) => ({ hostname: d.hostname, service: d.service, environment: d.environment }))
  : domains;
const workers = account
  ? await get(`accounts/${account}/workers/scripts`)
  : { skipped: 'Set CLOUDFLARE_ACCOUNT_ID to select an account.' };
report.websiteWorkers = Array.isArray(workers)
  ? workers
      .filter((w) => /nma|ogun/i.test(w.id))
      .map((w) => ({ name: w.id, modifiedOn: w.modified_on }))
  : workers;
report.publicHttp = [];
for (const host of [
  'nmaogun.com.ng',
  'www.nmaogun.com.ng',
  'portal.nmaogun.com.ng',
  'nmaogun.org.ng',
]) {
  for (const path of host.startsWith('portal.')
    ? ['/login', '/register', '/forgot-password']
    : ['/', '/home/']) {
    try {
      const response = await fetch(`https://${host}${path}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      });
      report.publicHttp.push({
        url: `https://${host}${path}`,
        status: response.status,
        location: response.headers.get('location'),
        server: response.headers.get('server'),
      });
      await response.body?.cancel();
    } catch {
      report.publicHttp.push({
        url: `https://${host}${path}`,
        error: 'HTTP or TLS connection failed',
      });
    }
  }
}
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));

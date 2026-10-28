import assert from 'node:assert/strict';

// Cloudflare may prepend separate groups for AI training crawlers.
export function assertPublicCrawlingAllowed(text) {
  const groups = [];
  let agents = [], rules = [];
  const finish = () => { if (agents.length) groups.push({ agents, rules }); agents = []; rules = []; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim();
    const match = /^(user-agent|allow|disallow)\s*:\s*(.*)$/i.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2].trim();
    if (key === 'user-agent') {
      if (rules.length) finish();
      agents.push(value.toLowerCase());
    } else rules.push({ key, value });
  }
  finish();
  for (const crawler of ['*', 'googlebot', 'bingbot', 'facebookexternalhit']) {
    const exact = groups.filter(g => g.agents.includes(crawler));
    const applicable = exact.length ? exact : groups.filter(g => g.agents.includes('*'));
    const rules = applicable.flatMap(g => g.rules);
    assert.ok(rules.some(r => r.key === 'allow' && r.value === '/'), crawler + ': public crawling must be allowed');
    // Equal-length Allow wins over Disallow under the robots exclusion protocol.
    assert.ok(!rules.some(r => r.key === 'disallow' && r.value === '/') || rules.some(r => r.key === 'allow' && r.value === '/'), crawler + ': root is blocked');
  }
}

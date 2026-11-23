interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  DB: D1Database;
  LOGIN_LIMITS: KVNamespace;
  ASSETS: Fetcher;
  PLATFORM_BOOTSTRAP_SECRET?: string;
}

type Admin = { id: string; email: string; full_name: string; password_hash: string };
type Organization = {
  id: string;
  slug: string;
  legal_name: string;
  display_name: string;
  status: string;
  created_at: string;
  industry_pack: string | null;
  hostname: string | null;
  short_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  plan_code: string | null;
  plan_name: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
};

const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function b64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

async function digest(value: string) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, count, saltText, hashText] = encoded.split('$');
  const iterations = Number(count);
  if (
    algorithm !== 'pbkdf2_sha256' ||
    !Number.isSafeInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 200_000 ||
    !saltText ||
    !hashText
  )
    return false;
  try {
    const salt = Uint8Array.from(
      atob(
        saltText
          .replaceAll('-', '+')
          .replaceAll('_', '/')
          .padEnd(Math.ceil(saltText.length / 4) * 4, '='),
      ),
      (c) => c.charCodeAt(0),
    );
    const expected = Uint8Array.from(
      atob(
        hashText
          .replaceAll('-', '+')
          .replaceAll('_', '/')
          .padEnd(Math.ceil(hashText.length / 4) * 4, '='),
      ),
      (c) => c.charCodeAt(0),
    );
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const actual = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
        key,
        expected.length * 8,
      ),
    );
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return b64url(bytes);
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function cleanString(value: unknown, max = 255) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function organizationPack(orgType: string) {
  if (orgType === 'nursing') return 'nursing';
  if (orgType === 'alumni') return 'alumni';
  if (orgType === 'other' || orgType === 'ngo' || orgType === 'society') return 'generic';
  return 'medical_doctor';
}

function apiError(message: string, status: number) {
  return json({ message }, status);
}

async function activeAdmin(request: Request, env: Env) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token || token.length < 40) return null;
  const tokenHash = await digest(token);
  const admin = await env.DB.prepare(
    `SELECT a.id,a.email,a.full_name FROM platform_sessions s
    JOIN platform_admins a ON a.id=s.admin_id
    WHERE s.token_hash=? AND s.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND a.status='active'`,
  )
    .bind(tokenHash)
    .first<{ id: string; email: string; full_name: string }>();
  return admin ? { admin, tokenHash } : null;
}

async function writeAudit(
  env: Env,
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  details: unknown = {},
) {
  await env.DB.prepare(
    `INSERT INTO platform_audit_logs(admin_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)`,
  )
    .bind(adminId, action, entityType, entityId, JSON.stringify(details))
    .run();
}

async function organizationRow(env: Env, id: string) {
  return env.DB.prepare(
    `SELECT o.id,o.slug,o.legal_name,o.display_name,o.status,o.created_at,
    s.industry_pack,d.hostname,b.short_name,b.primary_color,b.secondary_color,b.email_from_name,b.email_from_address,
    sub.plan_code,sub.plan_name,sub.status AS subscription_status,sub.trial_ends_at
    FROM organizations o
    LEFT JOIN organization_settings s ON s.organization_id=o.id
    LEFT JOIN organization_domains d ON d.organization_id=o.id AND d.is_primary=1
    LEFT JOIN organization_branding b ON b.organization_id=o.id
    LEFT JOIN organization_platform_subscriptions sub ON sub.organization_id=o.id
    WHERE o.id=?`,
  )
    .bind(id)
    .first<Organization>();
}

function mapOrganization(row: Organization) {
  const orgTypes: Record<string, string> = {
    medical_doctor: 'professional_association',
    nursing: 'professional_association',
    alumni: 'alumni',
    generic: 'other',
  };
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    legalName: row.legal_name,
    orgType: orgTypes[row.industry_pack ?? 'medical_doctor'] ?? 'other',
    status: row.status,
    createdAt: row.created_at,
    hostname: row.hostname,
    domains: [] as Array<{
      id: string;
      hostname: string;
      purpose: string;
      isPrimary: boolean;
      verifiedAt: string | null;
      verificationToken: string | null;
    }>,
    features: [] as Array<{ featureKey: string; enabled: boolean }>,
    branding: {
      primaryColor: row.primary_color,
      secondaryColor: row.secondary_color,
      emailFromName: row.email_from_name,
      emailFromAddress: row.email_from_address,
    },
    subscription: row.plan_code
      ? {
          planCode: row.plan_code,
          planName: row.plan_name ?? row.plan_code,
          status: row.subscription_status ?? 'trialing',
          trialEndsAt: row.trial_ends_at,
        }
      : null,
  };
}

async function getOrganization(env: Env, id: string) {
  const row = await organizationRow(env, id);
  if (!row) return null;
  const [domains, features] = await Promise.all([
    env.DB.prepare(
      `SELECT id,hostname,purpose,is_primary,verified_at,verification_token FROM organization_domains WHERE organization_id=? ORDER BY is_primary DESC,created_at ASC`,
    )
      .bind(id)
      .all<{
        id: string;
        hostname: string;
        purpose: string;
        is_primary: number;
        verified_at: string | null;
        verification_token: string | null;
      }>(),
    env.DB.prepare(
      `SELECT feature_key,enabled FROM organization_platform_features WHERE organization_id=? ORDER BY feature_key`,
    )
      .bind(id)
      .all<{ feature_key: string; enabled: number }>(),
  ]);
  const mapped = mapOrganization(row);
  mapped.domains = (domains.results ?? []).map((d) => ({
    id: d.id,
    hostname: d.hostname,
    purpose: d.purpose,
    isPrimary: Boolean(d.is_primary),
    verifiedAt: d.verified_at,
    verificationToken: d.verification_token,
  }));
  mapped.features = (features.results ?? []).map((feature) => ({
    featureKey: feature.feature_key,
    enabled: feature.enabled === 1,
  }));
  return mapped;
}

async function routeApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/u, '') || '/';
  const method = request.method.toUpperCase();

  if (path === '/v1/platform/auth/login' && method === 'POST') {
    const input = await readJson(request);
    const email = cleanString(input?.email, 320).toLowerCase();
    const password = typeof input?.password === 'string' ? input.password : '';
    if (!email || !password) return apiError('Email and password are required.', 400);
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const key = `login:${await digest(`${email}|${ip}`)}`;
    const attempts = Number((await env.LOGIN_LIMITS.get(key)) ?? '0');
    if (attempts >= 8) return apiError('Too many sign-in attempts. Try again later.', 429);
    const admin = await env.DB.prepare(
      `SELECT id,email,full_name,password_hash FROM platform_admins WHERE email=? COLLATE NOCASE AND status='active'`,
    )
      .bind(email)
      .first<Admin>();
    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      await env.LOGIN_LIMITS.put(key, String(attempts + 1), { expirationTtl: 900 });
      return apiError('Invalid email or password.', 401);
    }
    await env.LOGIN_LIMITS.delete(key);
    const token = randomToken();
    const tokenHash = await digest(token);
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO platform_sessions(token_hash,admin_id,expires_at) VALUES(?,?,?)`,
      ).bind(tokenHash, admin.id, expiresAt),
      env.DB.prepare(
        `DELETE FROM platform_sessions WHERE expires_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      ),
    ]);
    return json({
      accessToken: token,
      accessTokenExpiresIn: SESSION_SECONDS,
      user: { id: admin.id, email: admin.email, name: admin.full_name, roles: ['platform_admin'] },
    });
  }

  if (path === '/v1/platform/auth/bootstrap' && method === 'POST') {
    const input = await readJson(request);
    if (
      !env.PLATFORM_BOOTSTRAP_SECRET ||
      !input ||
      input.bootstrapSecret !== env.PLATFORM_BOOTSTRAP_SECRET
    )
      return apiError('Bootstrap is unavailable.', 404);
    const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM platform_admins`).first<{
      count: number;
    }>();
    if ((count?.count ?? 0) > 0) return apiError('A platform operator already exists.', 409);
    const email = cleanString(input.email, 320).toLowerCase();
    const name = cleanString(input.name, 160);
    const password = typeof input.password === 'string' ? input.password : '';
    if (!email.includes('@') || !name || password.length < 12 || password.length > 128)
      return apiError('Provide a valid email, name and password of at least 12 characters.', 400);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const bits = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
        key,
        256,
      ),
    );
    const encoded = `pbkdf2_sha256$100000$${b64url(salt)}$${b64url(bits)}`;
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO platform_admins(id,email,full_name,password_hash) VALUES(?,?,?,?)`,
    )
      .bind(id, email, name, encoded)
      .run();
    return json({ id, email, name }, 201);
  }

  const auth = await activeAdmin(request, env);
  if (!auth) return apiError('Platform sign-in required.', 401);
  if (path === '/v1/platform/auth/me' && method === 'GET')
    return json({
      id: auth.admin.id,
      email: auth.admin.email,
      name: auth.admin.full_name,
      roles: ['platform_admin'],
    });
  if (path === '/v1/platform/auth/logout' && method === 'POST') {
    await env.DB.prepare(`DELETE FROM platform_sessions WHERE token_hash=?`)
      .bind(auth.tokenHash)
      .run();
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  }

  if (path === '/v1/platform/organizations' && method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT o.id,o.slug,o.legal_name,o.display_name,o.status,o.created_at,s.industry_pack,
      (SELECT hostname FROM organization_domains d WHERE d.organization_id=o.id ORDER BY d.is_primary DESC,d.created_at ASC LIMIT 1) AS hostname
      FROM organizations o LEFT JOIN organization_settings s ON s.organization_id=o.id ORDER BY o.created_at ASC`,
    ).all<Organization>();
    return json(result.results.map((row) => mapOrganization(row)));
  }
  if (path === '/v1/platform/organizations' && method === 'POST') {
    const input = await readJson(request);
    if (!input) return apiError('Invalid request.', 400);
    const slug = cleanString(input.slug, 100).toLowerCase();
    const legalName = cleanString(input.legalName, 200);
    const displayName = cleanString(input.displayName, 160);
    const orgType = cleanString(input.orgType, 60);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
      return apiError(
        'Use a lowercase association slug with letters, numbers and single hyphens.',
        400,
      );
    if (legalName.length < 3 || displayName.length < 2)
      return apiError('Provide the association legal name and display name.', 400);
    const id = crypto.randomUUID();
    const pack = organizationPack(orgType);
    const plan = cleanString(input.planCode, 60) || 'starter';
    const trialDays = Math.min(Math.max(Number(input.trialDays) || 30, 0), 365);
    const affiliateId = crypto.randomUUID();
    const category =
      pack === 'alumni'
        ? ['full', 'Full member']
        : pack === 'nursing'
          ? ['full', 'Full Member']
          : ['full', 'Full member'];
    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO organizations(id,slug,legal_name,display_name,status) VALUES(?,?,?,?,'provisioning')`,
        ).bind(id, slug, legalName, displayName),
        env.DB.prepare(
          `INSERT INTO organization_settings(organization_id,industry_pack,settings) VALUES(?,?,?)`,
        ).bind(
          id,
          pack,
          JSON.stringify({
            countryCode: cleanString(input.countryCode, 2).toUpperCase() || 'NG',
            timezone: cleanString(input.timezone, 80) || 'Africa/Lagos',
            defaultCurrency: cleanString(input.defaultCurrency, 3).toUpperCase() || 'NGN',
          }),
        ),
        env.DB.prepare(
          `INSERT INTO organization_branding(organization_id,short_name,tagline,primary_color,secondary_color) VALUES(?,?,'Member services, made simple.','#2E5A88','#5C6B7A')`,
        ).bind(id, displayName),
        env.DB.prepare(
          `INSERT INTO affiliates(id,organization_id,name,code,hierarchy_level) VALUES(?,?,'Other / Not listed','OTHER','chapter')`,
        ).bind(affiliateId, id),
        env.DB.prepare(
          `INSERT INTO membership_categories(organization_id,code,name,sort_order) VALUES(?,?,?,0)`,
        ).bind(id, category[0], category[1]),
        env.DB.prepare(
          `INSERT INTO organization_platform_subscriptions(organization_id,plan_code,plan_name,status,trial_ends_at) VALUES(?,?,?,'trialing',datetime('now',?))`,
        ).bind(id, plan, plan === 'starter' ? 'Starter' : plan, `+${trialDays} days`),
      ]);
      await writeAudit(env, auth.admin.id, 'organization_provisioned', 'organization', id, {
        slug,
        orgType,
      });
      return json(await getOrganization(env, id), 201);
    } catch (error) {
      const message = String(error);
      return apiError(
        message.includes('UNIQUE constraint failed')
          ? 'That organization slug is already in use.'
          : 'Unable to provision organization.',
        message.includes('UNIQUE constraint failed') ? 409 : 500,
      );
    }
  }

  const match = path.match(/^\/v1\/platform\/organizations\/([0-9a-f-]{36})(?:\/(.*))?$/iu);
  if (!match) return apiError('Not found.', 404);
  const id = match[1]!;
  const action = match[2] ?? '';
  const exists = await env.DB.prepare(`SELECT id FROM organizations WHERE id=?`).bind(id).first();
  if (!exists) return apiError('Organization not found.', 404);

  if (!action && method === 'GET') return json(await getOrganization(env, id));
  if (action === 'activate' && method === 'POST') {
    await env.DB.prepare(
      `UPDATE organizations SET status='active',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
    )
      .bind(id)
      .run();
    await writeAudit(env, auth.admin.id, 'organization_activated', 'organization', id);
    return json(await getOrganization(env, id));
  }
  if (action === 'domains' && method === 'POST') {
    const input = await readJson(request);
    const hostname = cleanString(input?.hostname, 253).toLowerCase().replace(/\.$/u, '');
    const purpose = ['web', 'portal', 'api'].includes(cleanString(input?.purpose))
      ? cleanString(input?.purpose)
      : 'web';
    if (!/^(?=.{1,253}$)(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/u.test(hostname))
      return apiError('Provide a valid public hostname.', 400);
    const token = randomToken();
    const isPrimary =
      input?.isPrimary === true ||
      !(await env.DB.prepare(`SELECT 1 FROM organization_domains WHERE organization_id=?`)
        .bind(id)
        .first());
    try {
      const result = await env.DB.prepare(
        `INSERT INTO organization_domains(organization_id,hostname,is_primary,purpose,verification_token) VALUES(?,?,?,?,?) RETURNING id,hostname,purpose,is_primary,verified_at,verification_token`,
      )
        .bind(id, hostname, isPrimary ? 1 : 0, purpose, token)
        .first();
      await writeAudit(env, auth.admin.id, 'organization_domain_added', 'organization', id, {
        hostname,
        purpose,
      });
      return json({ ...result, isPrimary: isPrimary, verificationToken: token }, 201);
    } catch {
      return apiError('That hostname is already linked to an organization.', 409);
    }
  }
  const verifyMatch = action.match(/^domains\/([0-9a-f-]{36})\/verify$/iu);
  if (verifyMatch && method === 'POST') {
    const domain = await env.DB.prepare(
      `UPDATE organization_domains SET verified_at=COALESCE(verified_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE id=? AND organization_id=? RETURNING id`,
    )
      .bind(verifyMatch[1], id)
      .first();
    if (!domain) return apiError('Domain not found.', 404);
    await writeAudit(env, auth.admin.id, 'organization_domain_verified', 'organization', id, {
      domainId: verifyMatch[1],
    });
    return json({ ok: true });
  }
  if (action === 'features' && method === 'POST') {
    const input = await readJson(request);
    const featureKey = cleanString(input?.featureKey, 80).toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/u.test(featureKey) || typeof input?.enabled !== 'boolean')
      return apiError('A valid featureKey and enabled value are required.', 400);
    await env.DB.prepare(
      `INSERT INTO organization_platform_features(organization_id,feature_key,enabled) VALUES(?,?,?) ON CONFLICT(organization_id,feature_key) DO UPDATE SET enabled=excluded.enabled,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    )
      .bind(id, featureKey, input.enabled ? 1 : 0)
      .run();
    await writeAudit(env, auth.admin.id, 'organization_feature_updated', 'organization', id, {
      featureKey,
      enabled: input.enabled,
    });
    return json({ featureKey, enabled: input.enabled });
  }
  if (action === 'branding' && method === 'PATCH') {
    const input = await readJson(request);
    if (!input) return apiError('Invalid request.', 400);
    const primary =
      input.primaryColor == null || input.primaryColor === ''
        ? null
        : cleanString(input.primaryColor, 7);
    const secondary =
      input.secondaryColor == null || input.secondaryColor === ''
        ? null
        : cleanString(input.secondaryColor, 7);
    if (
      (primary && !/^#[0-9a-f]{6}$/iu.test(primary)) ||
      (secondary && !/^#[0-9a-f]{6}$/iu.test(secondary))
    )
      return apiError('Brand colors must use six-digit hex values.', 400);
    await env.DB.prepare(
      `UPDATE organization_branding SET primary_color=?,secondary_color=?,email_from_name=?,email_from_address=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE organization_id=?`,
    )
      .bind(
        primary,
        secondary,
        cleanString(input.emailFromName, 160) || null,
        cleanString(input.emailFromAddress, 320) || null,
        id,
      )
      .run();
    await writeAudit(env, auth.admin.id, 'organization_branding_updated', 'organization', id);
    return json((await getOrganization(env, id))?.branding ?? null);
  }
  return apiError('Not found.', 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/v1/platform/')) {
      try {
        return await routeApi(request, env);
      } catch {
        return apiError('Platform service is temporarily unavailable.', 503);
      }
    }
    return env.ASSETS.fetch(request);
  },
};

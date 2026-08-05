export type AppEnv = {
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;
  DATABASE_URL: string;
  DATABASE_URL_UNPOOLED: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_REFRESH_TTL_SECONDS: number;
  APP_PUBLIC_URL: string;
  /** Comma-separated browser origins allowed for credentialed CORS. Empty → localhost portal/web defaults. */
  CORS_ORIGINS: string | undefined;
  PLATFORM_BOOTSTRAP_SECRET: string | undefined;
  R2_ACCOUNT_ID: string | undefined;
  R2_ACCESS_KEY_ID: string | undefined;
  R2_SECRET_ACCESS_KEY: string | undefined;
  R2_BUCKET: string | undefined;
  R2_PUBLIC_BASE_URL: string | undefined;
  /** Explicit opt-in to mock ObjectStorage when R2 is unset (required in production without R2). */
  ALLOW_MOCK_STORAGE: boolean;
  STORAGE_DRIVER: 'mock' | 'r2';
};

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const nodeEnv = String(config.NODE_ENV ?? 'development');
  const port = Number(config.PORT ?? 3000);
  const logLevel = String(config.LOG_LEVEL ?? 'info');
  const databaseUrl = String(config.DATABASE_URL ?? '');
  const databaseUrlUnpooled = String(config.DATABASE_URL_UNPOOLED ?? databaseUrl);
  const redisUrl = String(config.REDIS_URL ?? 'redis://localhost:6379');
  const jwtAccessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  const jwtRefreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
  const accessTtl = Number(config.JWT_ACCESS_TTL_SECONDS ?? 900);
  const refreshTtl = Number(config.JWT_REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 30);
  const appPublicUrl = String(config.APP_PUBLIC_URL ?? 'http://localhost:3000');
  const corsOriginsRaw = config.CORS_ORIGINS ? String(config.CORS_ORIGINS).trim() : '';
  const corsOrigins = corsOriginsRaw.length > 0 ? corsOriginsRaw : undefined;
  const bootstrapSecret = config.PLATFORM_BOOTSTRAP_SECRET
    ? String(config.PLATFORM_BOOTSTRAP_SECRET)
    : undefined;

  const r2AccountId = optionalTrim(config.R2_ACCOUNT_ID);
  const r2AccessKeyId = optionalTrim(config.R2_ACCESS_KEY_ID);
  const r2SecretAccessKey = optionalTrim(config.R2_SECRET_ACCESS_KEY);
  const r2Bucket = optionalTrim(config.R2_BUCKET);
  const r2PublicBaseUrl = optionalTrim(config.R2_PUBLIC_BASE_URL);
  const r2Parts = [r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2Bucket];
  const r2SetCount = r2Parts.filter(Boolean).length;
  if (r2SetCount > 0 && r2SetCount < 4) {
    throw new Error(
      'Partial R2 configuration: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET together',
    );
  }
  const allowMockStorage =
    String(config.ALLOW_MOCK_STORAGE ?? '')
      .trim()
      .toLowerCase() === 'true';
  const storageDriver: 'mock' | 'r2' = r2SetCount === 4 ? 'r2' : 'mock';
  if (nodeEnv === 'production' && storageDriver === 'mock' && !allowMockStorage) {
    throw new Error(
      'Production requires Cloudflare R2 (set R2_*) or explicit ALLOW_MOCK_STORAGE=true',
    );
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT must be a positive number');
  }
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  if (!jwtAccessSecret || jwtAccessSecret.length < 16) {
    throw new Error('JWT_ACCESS_SECRET must be at least 16 characters');
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 16) {
    throw new Error('JWT_REFRESH_SECRET must be at least 16 characters');
  }
  if (bootstrapSecret !== undefined && bootstrapSecret.length < 16) {
    throw new Error('PLATFORM_BOOTSTRAP_SECRET must be at least 16 characters when set');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    LOG_LEVEL: logLevel,
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED: databaseUrlUnpooled,
    REDIS_URL: redisUrl,
    JWT_ACCESS_SECRET: jwtAccessSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_TTL_SECONDS: accessTtl,
    JWT_REFRESH_TTL_SECONDS: refreshTtl,
    APP_PUBLIC_URL: appPublicUrl,
    CORS_ORIGINS: corsOrigins,
    PLATFORM_BOOTSTRAP_SECRET: bootstrapSecret,
    R2_ACCOUNT_ID: r2AccountId,
    R2_ACCESS_KEY_ID: r2AccessKeyId,
    R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
    R2_BUCKET: r2Bucket,
    R2_PUBLIC_BASE_URL: r2PublicBaseUrl,
    ALLOW_MOCK_STORAGE: allowMockStorage,
    STORAGE_DRIVER: storageDriver,
  };
}

function optionalTrim(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

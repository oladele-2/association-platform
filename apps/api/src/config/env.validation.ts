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
  PLATFORM_BOOTSTRAP_SECRET: string | undefined;
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
  const bootstrapSecret = config.PLATFORM_BOOTSTRAP_SECRET
    ? String(config.PLATFORM_BOOTSTRAP_SECRET)
    : undefined;

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
    PLATFORM_BOOTSTRAP_SECRET: bootstrapSecret,
  };
}

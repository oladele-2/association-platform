# Neon setup (PostgreSQL)

This project uses **Neon** as the hosted PostgreSQL provider (serverless Postgres with branching).

## Connect the app (fastest path — no CLI)

1. Open [https://console.neon.tech](https://console.neon.tech) and sign in.
2. **Create a project** (if you do not have one yet):
   - Name: `association-platform` (or similar)
   - Region: pick closest (e.g. Europe / US East)
   - Postgres version: **16** if offered
3. Open the project → **Dashboard** → **Connection details**.
4. Select:
   - Role: the default owner role (or create `association_app` later)
   - Database: `neondb` (or create `association_platform`)
   - Connection: **Prisma** or **pooled** for app runtime  
     Use the **pooled** host (`-pooler` in hostname) for the Nest API.  
     Use the **direct** (non-pooler) host for Prisma migrations.
5. Copy the connection string(s).

### Recommended env vars

Put these in **root** `.env` and `packages/database/.env` (never commit):

```bash
# Runtime / Prisma Client (pooled)
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxxx-pooler.region.aws.neon.tech/neondb?sslmode=require"

# Migrations (direct — no pooler)
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@ep-xxxxx.region.aws.neon.tech/neondb?sslmode=require"
```

Prisma schema can keep a single `url` for Milestone 1–2 validation; from migration work onward we wire `directUrl` to `DATABASE_URL_UNPOOLED`.

## Create an API key (for neonctl / automation)

1. Neon Console → avatar → **Account settings** → **API keys**.
2. **Create new API key**, name it `association-platform-local`.
3. Copy once and store locally (e.g. user env var), **not in git**:

```powershell
# PowerShell (current user)
[System.Environment]::SetEnvironmentVariable("NEON_API_KEY", "napi_xxx", "User")
```

Or a gitignored file `.neon` / use system env only.

Then:

```bash
npx neonctl projects list --api-key $env:NEON_API_KEY
```

## Verify from this repo

After `.env` is filled:

```bash
pnpm --filter @association/database exec prisma db execute --stdin --schema prisma/schema.prisma
# or once migrations exist:
pnpm --filter @association/database exec prisma migrate status
```

A simple connectivity check:

```bash
pnpm --filter @association/database exec prisma db pull --print
```

(If the DB is empty, pull may show empty; connection success still prints schema header / errors clearly.)

## Security notes

- Prefer Neon **branches**: `main` for shared staging, ephemeral branches for PRs later.
- Rotate the connection password if it was ever pasted into chat.
- App role should not be a superuser; RLS (Milestone 2) assumes a non-bypass role.

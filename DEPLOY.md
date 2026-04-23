# Deploying vibe.pub to Cloudflare

## Prerequisites

- Cloudflare account with `vibe.pub` domain added
- [Resend](https://resend.com) account with API key
- `wrangler` CLI authenticated (`npx wrangler login`)

## First-Time Setup

### 1. Create D1 Database

```bash
npx wrangler d1 create vibe-pub
```

Copy the `database_id` from output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vibe-pub"
database_id = "<paste-id-here>"
```

### 2. Run Migration

```bash
npx wrangler d1 execute vibe-pub --remote --file=migrations/0001_init.sql
```

### 3. Create R2 Bucket

```bash
npx wrangler r2 bucket create vibe-pub
```

### 4. Set Secrets

```bash
npx wrangler secret put JWT_SECRET
# Enter a random 32+ character string

npx wrangler secret put RESEND_API_KEY
# Enter your Resend API key
```

### 5. Deploy

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name vibe-pub
```

### 6. Custom Domain

In Cloudflare dashboard:
1. Go to Pages > vibe-pub project > Custom domains
2. Add `vibe.pub`
3. DNS will be configured automatically if domain is on Cloudflare

## Subsequent Deploys

```bash
npm run build && npx wrangler pages deploy .svelte-kit/cloudflare --project-name vibe-pub
```

## Local Development

```bash
npm run dev -- --port 5180
```

run this command to format codes

```bash
npm run format
```

D1 runs locally via wrangler's local mode. To seed local DB:

```bash
npx wrangler d1 execute vibe-pub --local --file=migrations/0001_init.sql
```

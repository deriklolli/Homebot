# HOMEBOT — Handover Guide

Everything a new contributor needs to get productive. Read this first, then
`CLAUDE.md` for code conventions and the design system.

---

## 1. What this is

A home-management web app: track home projects, contractors, home assets,
inventory, recurring services, utility bills, and calendar events.

It is **multi-tenant**. Three roles, enforced in `src/middleware.ts` via
`user.app_metadata.role`:

| Role         | Lands on      | Can do                                                    |
|--------------|---------------|-----------------------------------------------------------|
| `homeowner`  | `/`           | The normal app. Default when no role is set.               |
| `manager`    | `/admin`      | Manages a set of homeowner clients on their behalf.        |
| `superadmin` | `/superadmin` | Manages organizations and managers.                        |

Managed accounts are created by a manager and carry `app_metadata.managed_by`.
Until `app_metadata.activated` is set, middleware forces them to `/activate`,
where they set their own password.

## 2. Access you need from Derik

Ask for these — none of them live in the repo:

- [ ] **GitHub** — collaborator on `deriklolli/Homebot`
- [ ] **Supabase** — member on the project (`yywtjsnkvmvevyylztfm`)
- [ ] **Vercel** — member on the project (crons and prod env vars live here)
- [ ] **`.env.local` contents** — send via a password manager or 1Password/Bitwarden
      share, **not** Slack/email/chat. Never commit this file.

## 3. Local setup

```bash
git clone https://github.com/deriklolli/Homebot.git
cd Homebot
npm install
cp .env.example .env.local   # then fill in the real values
npm run dev                  # http://localhost:3000
```

`npm run build` must pass before you push. `npm run lint` for ESLint.

### Environment variables

`.env.example` is the source of truth and is annotated. The short version:

**Required — the app will not boot without these**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client auth + queries
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS. Used by the admin/
  superadmin API routes and the alert crons. **Never expose this to the browser
  or put it in a `NEXT_PUBLIC_` variable.**

**Optional — features degrade quietly without them**
- `CRON_SECRET` — authorizes the `/api/alerts/*` and `/api/gmail/scan-cron` endpoints
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — email alerts and manager invites
- `ANTHROPIC_API_KEY` — consumable suggestions, warranty estimates, label scanning
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — Gmail
  utility-bill scanning (OAuth2)
- `GMAIL_TOKEN_ENCRYPTION_KEY` — encrypts stored Gmail refresh tokens
  (`openssl rand -hex 32`)
- `TWILIO_*` — SMS alerts

## 4. Database

Supabase Postgres. **There is no migration history in this repo** — the schema
was built through the Supabase dashboard. Before your first schema change,
snapshot the current state so there is a baseline:

```bash
npx supabase link --project-ref yywtjsnkvmvevyylztfm
npx supabase db pull
```

From then on, write changes as migrations (`supabase/migrations/`) rather than
clicking through the dashboard, so the two of you don't drift apart.

`supabase-rls-migration.sql` at the repo root is a historical one-off that
enabled RLS on the original 11 tables. It is **not** a complete schema and does
not cover the tables added since (`organizations`, `profiles`, `utility_bills`,
`utility_providers`, `gmail_connections`, `rooms`, `service_history`,
`home_asset_documents`, `project_estimates`, `project_contractors`,
`notification_preferences`, `consumable_cache`).

**RLS is the only thing separating tenants.** Every user-owned table filters on
`user_id = auth.uid()`. If you add a table, add its policies in the same change —
a table without policies is readable by anyone holding the anon key, which ships
in the browser bundle.

### Storage buckets
- `home-asset-images`
- `home-asset-documents`

### Data layer conventions
DB row types are prefixed `Db` in `src/lib/supabase.ts`. Convert rows to UI types
through the mappers in `src/lib/mappers.ts` — don't hand-map. Feature constants
live in `src/lib/<feature>-data.ts`.

## 5. Deployment

Vercel, from `main`. Pushing to `main` deploys to production — there is no
staging environment, so use PRs and preview deploys.

Three cron jobs are declared in `vercel.json` and run on Vercel's scheduler:

| Schedule      | Endpoint                 | Does                                  |
|---------------|--------------------------|---------------------------------------|
| `0 9 * * *`   | `/api/alerts/email`      | Daily service/warranty reminder emails |
| `0 9 * * *`   | `/api/alerts/sms`        | Daily reminder texts (Twilio)          |
| `0 8 1 * *`   | `/api/gmail/scan-cron`   | Monthly Gmail scan for utility bills   |

They authenticate with `CRON_SECRET`. To test one locally:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/alerts/email
```

## 6. External services

| Service              | Used for                                   | Key needed |
|----------------------|--------------------------------------------|------------|
| Supabase             | Database, auth, file storage                | yes        |
| Anthropic API        | Consumable suggestions, warranty estimates, label OCR | yes |
| Resend               | Transactional email                         | yes        |
| Twilio               | SMS alerts                                  | optional   |
| Google OAuth / Gmail | Utility-bill inbox scanning                 | yes        |
| ENERGY STAR (`data.energystar.gov`) | Appliance brand/model lookup | no |
| Skulytics            | Product catalog lookup                      | check      |
| Redfin / Bing / Amazon scraping | Home details, product images     | no         |

The scraping routes (`/api/scrape-home`, `/api/scrape-thumbnail`,
`/api/search-product-image`) parse third-party HTML and **will break when those
sites change their markup**. Treat failures there as expected maintenance, and
make sure they fail soft rather than blocking a user flow.

## 7. Known gaps and rough edges

1. **`service_history` has RLS disabled.** Every other table has it on. Until
   this is fixed, that table is readable and writable by anyone with the anon
   key. See "Open security items" below.
2. **No migration history.** See §4 — snapshot before changing anything.
3. **No tests.** There is no test runner configured. `npm run build` is the only
   automated check.
4. **No staging environment.** `main` is production.
5. **`CLAUDE.md` is out of date.** It predates the admin/superadmin,
   utility-bills, Gmail, and rooms features and still lists a 14px base font
   (now 15px). Worth refreshing as you go.
6. **Scraper fragility.** See §6.

## 8. Open security items

Two things surfaced during this handover. The first is fixed; the second needs
a decision from Derik.

**Fixed:** `scripts/insert-test-service.mjs` had the Supabase service role key
hardcoded in plaintext. It now reads from the environment. The file was never
committed, so the key was never pushed to GitHub — but it sat unprotected on
disk, so **rotate the service role key** in the Supabase dashboard
(Settings → API → service_role → Reset) and update it in `.env.local` and in
Vercel's environment variables.

**Needs a decision:** `public.service_history` has RLS disabled. Enabling it
without policies will block all access and break whatever reads that table, so
this needs to ship together with the right policies — most likely the same
`user_id = auth.uid()` shape the other tables use:

```sql
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;
-- then add policies matching the pattern in supabase-rls-migration.sql
```

## 9. Working agreement

- Branch off `main`, open a PR, don't push to `main` directly.
- `npm run build` passes before you push.
- Follow the conventions in `CLAUDE.md` — server components by default, dynamic
  imports for heavy libraries, explicit column lists in Supabase queries, no
  `select("*")`.
- If you add a table, add its RLS policies in the same PR.

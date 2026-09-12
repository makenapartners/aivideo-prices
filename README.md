# aivideo-prices

Backend + admin for AIVIDEO.NEWS's AI video pricing tracker. See
`pricing-tracker-spec_md.pdf` for the full spec this implements.

This repo has **no public pricing pages** — those live in the main
`aivideo-news-app` codebase and fetch data from this service's API. This
repo is just: database schema, API, and an `/admin` page for data entry.

Everything below can be done through GitHub's website, Netlify's
dashboard, and Neon's dashboard — **no local Node/npm install needed.**
(Netlify runs `npm install` for you automatically during deploy.)

## One-time setup

1. **Get this code into your GitHub repo**, without git on your computer:
   - Go to your empty `aivideo-prices` repo on github.com
   - Click "uploading an existing file" (shown on an empty repo's page)
   - Unzip `aivideo-prices.zip` on your computer and drag all the files
     and folders in, then commit.
   - (GitHub's web upload can be picky about nested folders — if it balks,
     GitHub Desktop, a free point-and-click app, handles this more
     reliably: open it, "Add local repository," point it at the unzipped
     folder, then Commit and Push.)

2. **Set environment variables in Netlify** (Site settings → Environment
   variables):
   - `DATABASE_URL` — from Neon: your project → Connection Details → copy
     the **pooled** connection string (host contains `-pooler`).
   - `ADMIN_SECRET` — make up a long password. This gates `/admin` and the
     admin API routes.

3. **Create the tables in Neon** — no local software needed:
   - Open your Neon project → SQL Editor
   - Open `prisma/migrations/20260912000000_init/migration.sql` from this
     repo, copy its contents, paste into the SQL Editor, run it.

4. **Seed the 5 launch models** — same approach:
   - In the same Neon SQL Editor, open `prisma/seed.sql` from this repo,
     copy its contents, paste, run it.
   - The last line runs a sanity check and should show
     `provider_count = 11`, `model_count = 5`.
   - This does **not** add any prices — you add those yourself in
     `/admin` so every number is tied to a source URL you've personally
     checked.

5. **Deploy on Netlify** — connect the repo, it auto-detects Next.js.
   No build config needed beyond what's in `netlify.toml`. Netlify
   installs dependencies and runs `prisma generate` for you as part of
   the build — you never run npm yourself.

6. **Go to `yoursite.netlify.app/admin`**, enter your `ADMIN_SECRET`, and
   add price entries.

## Pricing data to re-verify and enter

From the original research pass (verify each is still current before
entering — especially anything marked ⚠️ or ❓ in the spec):

- **Runway Gen4.5** — Direct: $0.12/sec, confirmed across 6+ sources.
  Also available via multiple resellers.
- **Google Veo** — Direct pricing exists but varies by source/date, enter
  with a "verify live" note. Marketplace pricing is more consistent —
  enter that with higher confidence.
- **Kling** — Direct pricing varies by region/promotion, caveat it.
  Renderful's tiered marketplace pricing was solid — enter that.
- **ByteDance Seedance** — Whether a direct API exists is contested;
  marketplace-only for now, well-documented across 4+ resellers (Fal.ai,
  Replicate, Renderful, Apiframe, Atlas Cloud, EvoLink — pick whichever
  you verified).
- **xAI Grok Imagine** — No direct pricing page found; marketplace-only,
  found via resellers.

**Do not add OpenAI Sora 2** — its API is scheduled to shut down
September 24, 2026 per OpenAI's deprecation page.

## API

- `GET /api/models` — all 5 models with price entries, cheapest-first
- `GET /api/models/[slug]` — one model's detail
- `GET/POST/PUT/DELETE /api/admin/providers` — requires `x-admin-secret` header
- `GET/POST/PUT/DELETE /api/admin/models` — requires `x-admin-secret` header
- `GET/POST/PUT/DELETE /api/admin/price-entries` — requires `x-admin-secret` header

## If you ever do have Node available

`prisma/seed.js` does the same thing as `prisma/seed.sql` but through
Prisma (`npm run db:seed`) — handy if you add fields later and want
seeding logic that stays in sync with the schema automatically. Not
needed for initial setup.

## What's deliberately not built yet (per spec, v1 scope)

No price history table, no alerts, no automated scraping/fetchers, no
search/filter UI, no cost calculator, no public API access for other
publishers. Add these later once the 5-model manual-verification
workflow is proven sustainable.

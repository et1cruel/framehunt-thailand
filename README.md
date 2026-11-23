# FRAMEHUNT THAILAND

**Find your next frame.** A cinematic location database for music videos, film and photo shoots across Thailand — built around one rule: _no verified photos, no publication._

Soft glass and clay surfaces frame real location photography. Thai-first UI with English content.

---

## Current production inventory (2026-11-23)

| Metric                            | Value              |
| --------------------------------- | ------------------ |
| Unique location listings across all browse directories | **3,025** |
| Core locations passing the full publication gate       | **582**   |
| Drafts in the core location dataset                     | **251**   |
| Rejected research leads                                 | **408**   |
| Verified photos in the core published catalogue        | **3,211** |
| Unique credited photographers                           | **685**   |
| Provinces covered by the core catalogue                 | **70 of 77** |
| Nakhon Pathom collection entries                        | **142**   |

The **3,025** aggregate combines the core catalogue, activity directory,
restaurants, second-hand shops, studios and music-venue directory, removing
33 detected overlaps. It is a count of listings in the current site data, not a
census of every operating place in Thailand. The supplemental activity directory
was updated on 2026-11-22; other sources have their own update dates.

The core catalogue is generated from **Wikidata**, **Wikipedia**, and
**Wikimedia Commons**, with the **UNESCO World Heritage Centre** as the
coordinate source for Ban Chiang. Its current snapshot is dated 2026-11-20 UTC
(2026-11-21 in Thailand). No AI imagery, no stock filler, no invented
coordinates.

Every published location has **≥ 5 unique verified photos**, each with photographer, license, source page and checksum. Photos are hotlinked from Wikimedia with attribution — they are not copied into another bucket.

> Core-catalogue counts come from `src/data/locations.generated.json` and its
> reconciled ingest report. The all-directory count is computed by
> `countCatalogPlaces()` from the current browsable source files. These are
> separate evidence levels; do not present all 3,025 listings as having passed
> the core publication gate.

---

## Catalogue loading

The prebuild step generates a content-hashed JSON asset containing the 582
published locations and only one signature cover per place. Full photo archives
are separate content-hashed assets and load when a visitor hovers a location
card or opens its detail page. Failed covers can retry other verified photos
from that same place. The archive retains the photo credits, licences and source
links. Draft and review records remain in the lazy-loaded admin route. Both
catalogue and gallery assets use immutable caching because their URLs change
whenever their contents change.

In the 2026-11-23 build, the app entry chunk is **217.98 KB gzip**; the new
cover-only catalogue is **4.55 MB raw / 631 KB gzip / 370 KB Brotli**. That is
about **39% less gzip data** than the previous 1.03 MB catalogue. The 582
on-demand photo archives total **5.82 MB raw**, with the largest individual
archive at 44.4 KB. The full admin-only data chunk is **10.82 MB raw / 1.24 MB
gzip**, and the MapLibre bundle stays deferred until its map is approached.
These are built-asset sizes, not measured connection timings.

---

## Stack

- **React 19 + TypeScript (strict) + Vite 7**
- **Tailwind CSS v4** with a custom design-token layer
- **React Router 7**, **TanStack Query 5**, **Framer Motion**, **Lucide**
- **MapLibre GL JS** + OpenFreeMap (no API key)
- **Supabase** (Postgres + PostGIS + pg_trgm + Auth + RLS)
- **Cloudflare Pages** + Pages Functions
- **Vitest** (unit) and **Playwright** (E2E)
- **ESLint 9** (flat config) + **Prettier**

---

## The publish gate

A location can only appear publicly when **all** of these are true:

1. `status = "published"`
2. ≥ **5** photos with `is_verified = true`
3. Every photo in the record is verified (`photos.length === verified`)
4. Finite latitude/longitude inside Thailand (5–21 N, 97–106 E)
5. At least one HTTPS evidence source

Verified photos must have a checksum, distinct original URL, credit and
license. The database prevents edits to published photos or sources that
would make a location fail the gate.

The gate is enforced in **three places**:

| Layer     | Where                                                                                                      |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Ingestion | `scripts/ingest/run.mjs` — rejects or drafts anything short of the gate                                    |
| Client    | `isPublishable()` in `src/services/locations.ts` — public getters filter again                             |
| Database  | `locations_before_write`, `photos_guard_published` and `sources_guard_published` in `supabase/migrations/` |

Permission, drone, cost and contact fields default to `unknown` / `null` and render as **“ยังไม่มีข้อมูลยืนยัน”**. Commercial filming rights and drone permission are never inferred from public access.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # optional — the app runs without keys
npm run dev
```

Without Supabase configuration the app reads the bundled dataset. Submissions
and reports stay in the browser in this mode. Favourites and boards are
browser-local in both modes.

```bash
npm run typecheck     # tsc -b
npm run lint          # eslint .
npm run test          # vitest run (43 tests)
npm run test:e2e      # playwright test (13 tests, needs `npx playwright install chromium`)
npm run build         # prebuild sitemap + tsc + vite build
npm run verify:preview  # loads the built bundle on 7 routes, fails on JS errors
```

---

## Project structure

```
src/
  components/        UI kit, layout, location cards, gallery, map, search
  data/              types, taxonomy, provinces, generated dataset
  lib/               utils, submission validation, Supabase client, SEO
  pages/             Home, Explore, Location detail, Map, Find My Vibe,
                     Boards, Submit, About, Admin, 404, Auth callback
  services/          dataset queries (publish gate, search, vibe),
                     local store, auth, TanStack Query hooks
scripts/
  ingest/            Wikidata + Wikimedia pipeline (seeds, wikidata,
                     commons, run)
  gen-sitemap.mjs    sitemap + robots from published rows
  gen-taxonomy-seed.mjs  provinces/categories/moods → SQL
  render-assets.mjs  OG card + icons from SVG
supabase/migrations/ initial schema, taxonomy seed and publication enforcement
functions/api/       health, locations, submissions, reports
e2e/                 Playwright smoke suite
public/              _headers, _redirects, 404, icons, sitemap
data/reports/        ingest report, photo manifest, run log
```

---

## Routes

| Route              | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `/`                | Editorial home, real counts, featured frames, map preview         |
| `/explore`         | Search + filters + list/map split                                 |
| `/locations/:slug` | Photo archive, production notes, permission honesty, sources      |
| `/live-music`      | Event and venue links with genre, province and venue type filters |
| `/map`             | Full-bleed MapLibre map with clustering                           |
| `/find-my-vibe`    | Mood-based scoring with human-readable reasons                    |
| `/boards`          | MV shot-list boards, share links, export                          |
| `/submit`          | Community submission with validation                              |
| `/about`           | Data policy, licensing, limitations                               |
| `/admin`           | Publish-gate table, submissions, reports, data quality            |

---

## Expand the location catalog

`scripts/ingest/expansion.tsv` contains research leads for all 77 provinces.
A lead needs matching Wikidata coordinates and five distinct, licensed images
before it enters the public directory. The expansion collects the files directly
from the location's Wikimedia Commons category. It checks the image download,
decoding, photo credit and license, and checks for duplicate hashes.

```bash
npm run ingest:expand
npm run db:seed
npm run build
```

The import appends to the existing catalog. To revisit expansion drafts, use
`npm run ingest:expand -- --retry-drafts`. A draft is updated when the
import finds more eligible photos for the same Wikidata item. The generated
report and per-photo manifest are under `data/reports/`.

For the Night City and music batch, run
`node scripts/ingest/run.mjs --expand --night-music`.
Run `node scripts/ingest/curate-covers.mjs --apply --enrich-night`
to review covers and look for verified night images of the same location.
Manual selections are in `scripts/ingest/cover-picks.json`.

`--low-key` loads the Hidden Frames and Art Space leads. `--bangkok-frames`
loads the additional Bangkok leads. Both flags take `--expand`.
Run `node scripts/ingest/curate-covers.mjs --apply --signature-assets` to
refresh cover selections, Hidden Frames tags and curated photo supplements.

## Supabase setup

1. Create a project and enable the **PostGIS** extension (the migration does this).
2. Initialize the CLI configuration if `supabase/config.toml` is absent,
   then link the Framehunt project and apply the migrations:

   ```bash
   supabase init
   supabase link --project-ref <ref>
   supabase db push
   ```

   Or run all files in `supabase/migrations` in filename order in the SQL editor.

3. Set frontend env (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
   `VITE_ALLOW_LOCAL_MODE=false` for production) and server env
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) in `.dev.vars` / Pages secrets.
   Add `<site-origin>/auth/callback` to the Supabase Auth redirect allowlist.
   The catalog uses Supabase as soon as both frontend variables are present.
   Submissions and reports then require a running Pages Functions environment.

4. Promote your first admin **after** signing up:

   ```sql
   update public.profiles set role = 'admin' where email = 'you@studio.com';
   ```

5. Load the verified dataset (optional but recommended):

   ```bash
   npm run db:seed          # writes supabase/seed/locations.sql
   psql "$DATABASE_URL" -f supabase/seed/locations.sql
   ```

   The seed inserts new locations as drafts, loads the evidence and publishes
   the locations marked published in the source dataset through the database
   gate. Re-running it preserves existing editorial changes and archives.

### RLS summary

- Anonymous visitors read **published** locations, their verified photos, sources and taxonomy only.
- The app reads the signed-in user's role from `profiles`. Only admins can
  change publication status and review submissions or reports.
- Boards are private to their owner; shared boards are exposed through `get_shared_board(share_slug)`.
- Public submissions and reports go through Pages Functions. Admins can read
  their queues and update review status under RLS.
- Location status changes are written to `admin_audit_log`.

---

## Cloudflare Pages deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name framehunt-thailand
```

Set secrets:

```bash
npx wrangler pages secret put SUPABASE_URL --project-name framehunt-thailand
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name framehunt-thailand
```

`public/_headers` sets CSP, HSTS and frame protections. `public/_redirects` sends unknown `/api/*` paths to a JSON-safe 404 and everything else to the SPA shell. `wrangler.toml` documents the optional KV binding used for per-IP rate limiting.

---

## Honest status

**Working and verified locally**

- 506 published locations, 2,847 photos, publish gate enforced in code and tests.
- Search, filters, distance sort, vibe matching, map, local boards, submission validation and the local admin dashboard.
- 43 unit tests and 13 Playwright E2E tests cover the local app, mobile radius
  filtering and the Supabase catalog response contract.
- Production build succeeds and the built bundle passes a 8-route preview smoke test.

**Authored but not live-verified (no credentials in this environment)**

- PostgreSQL/PostGIS migrations, the full seed, status audit and RLS checks
  passed on an embedded local database. Hosted Supabase has yet to be configured.
- Live login, public catalog and admin mutations still need a hosted integration test.
- Pages Functions require server bindings. The health endpoint reports whether
  a database and the optional rate-limit binding are configured.
- Cloudflare deployment — configuration is present; no deployment was performed.

**Known limitations**

- 69 of 77 provinces currently have published locations.
- No verified cost, crew-size, parking, dressing-room or drone data yet.
- Photos are Wikimedia hotlinks; if a source file is deleted the image breaks.
- Admin local mode is a demo, **not** secure authentication. Production requires Supabase Auth + `admin` role.
- The hosted admin supports status changes and moderation. Creating or editing
  records, importing photos, uploading and recording manual image approval
  still require an editorial interface.
- The generated sitemap reflects the bundled snapshot. Live catalog
  publishing does not update it.
- Commercial filming permission is `unknown` for every record unless a source explicitly states otherwise.

See [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for the full evidence log.

---

## Licensing

- Code: proprietary (this repository).
- Photography: each image keeps its Wikimedia Commons license; attribution is stored per photo and rendered in the UI.
- Wikipedia text: CC BY-SA, attributed with a link to the source article.
- Coordinates and identifiers: Wikidata (CC0).

If you reuse a photo, follow its license link — not this README.

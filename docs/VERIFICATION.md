# Verification log — FRAMEHUNT THAILAND

Generated: 2026-11-20
Environment: Windows 11, Node 24.22.0, npm, Vite 7.3.8, Chromium 1255 (Playwright)

This file records what was actually executed. Anything not executed is listed
under **Not verified** rather than implied to work.

---

## 1. Dataset

Source: `src/data/locations.generated.json` + `data/reports/ingest-report.json`.

```text
total records        50
published            46
draft                 4
rejected seeds       19
verified photos     537
photographers       151
provinces covered    20 / 77
zone A / B / C       14 / 6 / 26
```

Verification performed with Node against the generated JSON:

- Every published record has `photos.length === verified count` and ≥ 5.
- Every photo has non-empty photographer, license, attribution, HTTPS source
  page and image URL, plus positive width/height.
- Every published coordinate falls inside Thailand (5–21 N, 97–106 E).
- No record sets `drone_allowed = "yes"`.
- No record claims `permission_status = "allowed"` without a source and
  verification timestamp.

These invariants are asserted in `src/services/locations.test.ts` and pass.

License spread (from the ingest report) is led by CC BY-SA 4.0 (252 photos);
10 distinct licenses are represented. Attribution is stored per photo and
rendered on the detail page.

---

## 2. Commands executed

| Command                           | Result                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm install`                     | 378 packages installed (plus ESLint helpers)                                                                         |
| `npx tsc -b`                      | Pass, 0 errors                                                                                                       |
| `npx eslint .`                    | 0 errors, 3 `react-refresh/only-export-components` warnings (intentional: files export helpers alongside components) |
| `npx vitest run`                  | **40 passed / 40** in 3 files                                                                                        |
| `npx playwright test`             | **11 passed / 11** (Chromium)                                                                                        |
| `node scripts/verify-preview.mjs` | **7 / 7 production-bundle checks passed** (home, explore, detail, vibe, about, 404, map canvas)                      |
| `npm run build`                   | Pass — `tsc -b && vite build`                                                                                        |
| `node scripts/gen-sitemap.mjs`    | 46 published locations + 7 static routes                                                                             |
| `node scripts/seed-locations.mjs` | 50 locations, 537 photos → `supabase/seed/locations.sql`                                                             |

### Unit tests (40)

`src/services/locations.test.ts` — 22 tests

- publish gate rejects < 5 photos, non-numeric coordinates, and any record
  whose photo array is not fully verified
- drafts are never returned by `getLocation`
- dataset meta counts match the JSON
- unique slugs/ids, coordinates inside Thailand
- every published photo has attribution, license, HTTPS source
- no duplicate checksum or perceptual hash inside a location
- no unverified permission claims, no drone `yes`
- search by name, province, category, radius, distance sort, photo sort
- search never returns drafts
- Thai suggestion lookup
- vibe scoring returns ranked matches with 1–3 reasons
- nearby results sorted by distance
- stats consistent with the dataset

`src/lib/utils.test.ts` — 12 tests

- haversine distance (Bangkok–Chiang Mai 560–610 km)
- distance/coordinate/date formatting, clamping, percentages
- URL sanitisation rejects `javascript:` and `data:`
- board share encode/decode round-trip with Thai text, corrupted payload → null
- HTML stripping, unique id generation

`src/lib/submission.test.ts` — 6 tests

- required name/province/description
- complete plausible submission passes
- coordinates outside Thailand rejected
- malformed coordinates rejected
- non-HTTP source rejected
- malformed email rejected, empty email allowed

### E2E tests (11)

`e2e/smoke.spec.ts`, Chromium, remote images blocked for determinism:

1. Home renders editorial hero and real counts
2. Search suggestions navigate to a published location
3. Explore filters by province and never shows drafts
4. Location detail shows photos, permission honesty, evidence
5. Map page initialises MapLibre canvas
6. Find My Vibe returns matched frames
7. Boards can be created and persist
8. Submit form validates, then accepts a complete request
9. Admin requires sign-in, then shows real data quality
10. About page states licensing and limitations
11. Unknown route renders a 404 with recovery links

---

## 3. Build output

```text
dist/index.html                        1.9 kB
dist/assets/index-*.css              138.2 kB │ gzip 21.6 kB
dist/assets/vendor-*.js               85.0 kB │ gzip 28.0 kB
dist/assets/index-*.js               501.2 kB │ gzip 158.7 kB
dist/assets/dataset-*.js           1,272.0 kB │ gzip 136.5 kB
dist/assets/map-*.js               1,054.1 kB │ gzip 285.0 kB
```

The dataset and MapLibre are split into separate chunks; MapLibre only loads
on pages that render a map. The build prints a chunk-size warning for the map
and dataset chunks — expected for a map product with a bundled verified dataset.

---

## 4. Database objects authored

`supabase/migrations/0001_init.sql`

- Extensions: `postgis`, `pg_trgm`, `pgcrypto`
- Enums: `location_status`, `permission_status`, `tri_state`,
  `submission_type`, `submission_status`, `report_status`, `user_role`
- Tables: `provinces`, `categories`, `moods`, `profiles`, `locations`,
  `location_photos`, `location_sources`, `location_categories`,
  `location_moods`, `boards`, `board_items`, `location_submissions`,
  `content_reports`, `admin_audit_log`
- Generated `geography(Point,4326)` column + GiST index
- Trigram GIN index for Thai/English name search
- Publish gate:
  - `verified_photo_count(text)`
  - `assert_publishable(text)`
  - `locations_before_write` (rejects publish on insert; re-checks on update)
  - `photos_guard_published` (blocks dropping below 5 verified photos while
    published; enforces a single cover photo)
- RPCs: `nearby_locations`, `search_locations`, `get_shared_board`
- RLS on all 14 tables; public reads published rows only; admin role required
  for editorial writes; anonymous insert allowed for submissions and reports
- Profile auto-creation trigger on `auth.users`

`supabase/migrations/0002_taxonomy.sql`

- 77 provinces, 51 categories, 19 moods generated from the app taxonomy

`supabase/seed/locations.sql`

- 50 locations inserted as drafts, 537 photos, sources, category/mood joins
- Second pass publishes rows only when the database gate passes

**Not applied to a live Supabase project** — no project credentials were
available in this environment.

---

## 5. Pages Functions authored

| Endpoint               | Method | Behaviour                                                                     |
| ---------------------- | ------ | ----------------------------------------------------------------------------- |
| `/api/health`          | GET    | Config booleans, publish-gate summary, timestamp                              |
| `/api/locations`       | GET    | `q`, `province`, `limit`, `offset`, `near`, `radius` via PostgREST RPCs       |
| `/api/locations/:slug` | GET    | Published location with verified photos, sources, taxonomy                    |
| `/api/submissions`     | POST   | Server-side validation, honeypot, optional KV rate limit, service-role insert |
| `/api/reports`         | POST   | Validates slug against published rows, then inserts report                    |

The data endpoints return `503 not_configured` when `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` are absent. The health endpoint reports configuration
status. The service-role key is read only
inside `functions/api/_lib.ts` and never included in a response.

Middleware adds `nosniff`, `DENY` framing, referrer policy and a restrictive
permissions policy. `public/_headers` adds CSP and HSTS for the static app.

**Not deployed** — no Cloudflare account credentials were available.

---

## 6. Not verified

| Item                                       | Reason                       | What is needed                                |
| ------------------------------------------ | ---------------------------- | --------------------------------------------- |
| Supabase migrations applied                | No project ref / credentials | `supabase link` + `supabase db push`          |
| RLS on the hosted Supabase project         | No hosted Framehunt project  | Verify hosted Auth sessions and role policies |
| Pages Functions against a real DB          | No deployment                | `wrangler pages deploy` + secrets             |
| Cloudflare headers/redirects in production | No deployment                | Deploy and inspect response headers           |
| Real email auth flow                       | No Supabase project          | Configure Auth provider and redirect URLs     |
| Wikimedia hotlink longevity                | External                     | Re-run ingest / monitor broken images         |

---

## 7. Phase report

| Field                        | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented features**     | Verified dataset pipeline; publish gate in ingest/client/DB; Thai-first editorial UI; search + filters + radius; MapLibre map with clustering; location detail with photo archive and permission honesty; Find My Vibe scoring; MV boards with share links; community submissions; content reports; admin dashboard (overview, gate table, submissions, reports, data quality, export); Supabase schema/RLS/triggers; Pages Functions; Cloudflare config; SEO/sitemap/OG assets; 40 unit + 11 E2E tests |
| **Files created/modified**   | ~70 source files; see `README.md` project structure                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Tests passed/failed**      | Unit 40/40 passed; E2E 11/11 passed; lint 0 errors (3 warnings); typecheck pass; build pass                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Verified location count**  | **46**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Published location count** | **46** (4 drafts held back by the photo gate)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Remaining issues**         | 57 provinces without published locations; no verified cost/crew/parking/drone data; Supabase and Cloudflare not live-verified; admin local mode is a demo; photos depend on Wikimedia hotlinks                                                                                                                                                                                                                                                                                                          |

## 8. Follow-up against the master prompt

| Phase                     | Verified in this pass                                                                                                                                                                                        | Open work                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1. Foundation             | Applied schema, taxonomy, publication migration and seed to local PostgreSQL/PostGIS.                                                                                                                        | Configure the dedicated hosted Supabase and Cloudflare projects.                                                                |
| 2. Discovery              | Public pages use the same catalog. The Supabase response contract passed a test using the real client against a test response.                                                                               | Extend advanced filters for verified production logistics.                                                                      |
| 3. Mapping                | MapLibre preview renders and the OpenFreeMap style endpoint returned HTTP 200. Explore and Map offer radius filtering on location opt-in.                                                                    | Validate the map on physical devices and the Cloudflare preview.                                                                |
| 4. Content                | 46 published, 4 drafts, 19 rejected research seeds, 537 photos, 20 provinces. Zone A 14/20, B 6/15, C 26/25 against the initial targets. Five Wat Arun photo URLs returned HTTP 200 with an image MIME type. | Expand coverage, confirm filming permissions and add manual photo review/upload tools.                                          |
| 5. Accounts and editorial | Added profile-backed admin access, publication controls, status audit, submission and report queues. Local PostgreSQL tests verified RLS and queue writes by role.                                           | Run real email login and moderation against hosted Supabase. Boards and favourites remain browser-local. Comparison is pending. |
| 6. Production             | TypeScript now checks Pages Functions, including the corrected catalog API import.                                                                                                                           | Hosted integration testing, deployment, live sitemap updates, production performance and backup verification.                   |

The seed can be re-run without changing locations already in the database,
including archived records. Local SQL tests verified that a short photo set,
unverified or duplicated photos, and missing evidence prevent publication.
They also verified that a published location's evidence cannot be removed
until its status changes.

Final checks for this pass: 43/43 unit tests, 12/12 Playwright tests including
radius filtering on a 390px viewport, and 7/7 production-bundle route checks.
On the local production preview, Chromium loaded five distinct Wat Arun
photos through the fullscreen gallery at a 390px viewport.
Type checking and build passed. ESLint reported zero errors and three existing
Fast Refresh warnings. Vite reported its large-chunk warning.

## 9. Nationwide catalog expansion

The expanded local catalog contains **242 published locations in 65 provinces**
with **1,510 verified photos**. There are 51 drafts with 40 additional photos
and 48 rejected research leads. Of the 197 published records added in this
pass, one replaces the previous Phuket Big Buddha record, for a net increase
of 196 published listings.

- Bangkok: 69 published
- Metropolitan area: 17 published
- Other provinces: 156 published

The expansion used 281 curated leads across all 77 provinces. New published
galleries passed checks for direct Wikimedia Commons category membership,
licensed credits, readable image downloads, and distinct checksums, URLs and
perceptual hashes.

Coordinates were compared with geoBoundaries province geometry. The review
corrected Ban Chiang's pin using the UNESCO periodic report, assigned the existing
Tiger Cave Temple listing to Krabi, replaced Phuket Big Buddha's mismatched
record and identified the Chiang Saen Wat Pongsanuk separately from the Lampang
temple. Small boundary exceptions include coastal islands and the Phu Chi Fa
border viewpoint.

- [geoBoundaries Thailand province metadata](https://www.geoboundaries.org/api/current/gbOpen/THA/ADM1/)
- [Ban Chiang UNESCO periodic report](https://whc.unesco.org/document/216972)
- [Ko Poda, Tourism Authority of Thailand](https://www.tourismthailand.org/Attraction/ko-poda)

## 10. Night City, cover photography and live music

This pass reviewed 165 additional research leads and added 52 published
locations. The catalog now has 294 published locations, 1,780 published
images and 69 provinces. The Night City filter has 33 locations, up from two.
Ten new night images were added to existing galleries from location-specific
Wikimedia sources. Every published record has exactly one cover and at least
five verified photos.

We read shortlisted image thumbnails for all 294 locations. Image ranking used
framing, contrast, clipped highlights, center detail, resolution and caption
signals. Eight featured covers were chosen by visual comparison. The final
selection differs from 153 previous covers. See
`data/reports/cover-review.json` for the source and selection method per record.

The Live Music page links 22 event or program references from 18 venues and
can filter genre, province and venue type. Seven locations with gallery evidence
also appear in the public Live Music location filter. The event list is a
curated snapshot. Check the linked organizer page for current schedules or
availability. The guide does not publish incomplete venue photo records.

Ran 43 unit tests, 13 Chromium tests and eight production preview checks.
Local PostgreSQL/PostGIS accepted the updated taxonomy and the complete seed.
A mobile Chromium check loaded the Soi Cowboy cover and returned the correct
Volume and Blueprint links for the Bangkok rap and Live House filters.

- [Volume Livehouse and RAP IS NOW](https://www.zipeventapp.com/e/VOL-IS-NOW)
- [Blueprint Livehouse](https://blueprintlivehouse.com/)
- [Bangkok Kunsthalle IMPEDANCE promoter listing](https://ra.co/events/2586995)
- [RED CNX](https://redcnx.com/red-cnx)
- [Illuzion Phuket](https://www.illuzionphuket.com/venue/illuzion/)

## Bangkok, Hidden Frames, and Art Spaces expansion (2026-11-20)

The public catalog grew from 294 to 506 locations and from 107 to 237 in
Bangkok. It now covers 70 provinces with 2,847 verified published photos.
Hidden Frames has 130 locations, including 46 in Bangkok. Art Spaces grew
from four to 13, and Night City grew from 33 to 35.

The catalog has distinct slugs and Wikidata IDs. The expansion also checks
the normalized Commons category and nearby matching names for repeated leads.
The final geographic check found that the Saen Saep Canal entry pointed outside
Bangkok. It remains a draft pending evidence for a specific Bangkok viewpoint.
The Phra Khanong Canal and Bangkok Corrections Museum entries remain drafts
pending photos that distinguish them from Wat Mahabut and Rommaninat Park.
Wat Chong Kham stays in review while Wat Chong Klang is the public listing
for the adjacent temples. Khun Tan Tunnel crosses the Lamphun–Lampang border.
The palace pin at Ko Sichang is on the coastline within boundary-map precision.

The cover report records 39 editor selections and 467 ranked selections.
There are 30 location-specific camera notes with a matching image credit.
BACC uses an overhead atrium photo showing the spiral ramp. The Thai Human
Imagery Museum uses a tableau from *Phra Aphai Mani*. The Neilson Hays
Library recommendation uses the exterior and follows its published rules.

Passed 43 unit tests, 14 Chromium tests, eight production preview checks and
the local PostgreSQL/PostGIS seed checks. A 390px Chromium preview returned the
expected Bangkok, Hidden Frames and Art Spaces results, loaded both the BACC
and Neilson Hays covers and showed the camera note.

- [Tourism Authority of Thailand on Kudi Chin](https://www.tourismthailand.org/Articles/wander-through-kudi-chin-en)
- [Tourism Authority of Thailand on Talat Phlu](https://www.tourismthailand.org/Articles/talat-phlu)
- [Neilson Hays Library photography policy](https://www.neilsonhayslibrary.org/photography-policy)
- [River City Bangkok](https://rivercitybangkok.com/)
- [Tourism Authority of Thailand on Ban Dam Museum](https://www.tourismthailand.org/Attraction/ban-dam-museum)

## First-load performance and inventory honesty (2026-11-23)

The homepage hero requests its responsive cover eagerly at high priority and
reserves the image dimensions to reduce layout movement. The homepage map now
uses an intersection-triggered dynamic import with a glass/clay loading surface;
the shared MapLibre stylesheet is imported with the map instead of the initial
application shell. The footer labels its source date as `CORE DATA UPDATED` so
it cannot be mistaken for the update date of every supplemental directory.

The current inventory documentation distinguishes 3,025 unique listings
across browse directories from 582 core locations passing the full publication
gate. The 3,025 figure is the current aggregate of site data sources, not a
census of every operating place in Thailand; each source has its own update date.

Validation for this pass: `npm run build` passed. In the local production
preview, the hero image decoded at 763px natural width and retained eager/high
priority settings. The initial homepage made zero requests for MapLibre bundles
or map tiles; approaching the map section loaded the deferred JavaScript and
rendered one map canvas. Desktop and mobile homepage screenshots were inspected.
The generated MapLibre chunk remains about 1.05 MB raw and the catalogue data
chunk remains large; deferring the map removes those map assets from the initial
request path but does not reduce their eventual download size.

## Catalogue payload split (2026-11-23)

The public browser catalogue is now generated as a content-hashed static JSON
file containing only the **582 published** records. The small generated
manifest carries the current catalogue metadata and hashed asset path. Cloudflare
Pages applies one-year immutable caching to that hashed JSON URL. The full
833-record working set is imported only by the lazy admin route.

Validation for this pass: `npm run build` passed. The built app entry is
1,275.98 KB raw / 216.80 KB gzip; the public JSON is 9,282,418 bytes raw /
1,032,902 bytes gzip. The full admin-only JSON chunk remains separate at
10,822,548 bytes raw / 1,237,920 bytes gzip. In the local production preview,
the homepage rendered its hero, collection cards and current counts: 3,025
all-directory listings, 582 core locations, 3,211 photos and 142 Nakhon Pathom
directory entries. The home page showed the map's reserved loading state before
scrolling to the map. These are bundle sizes, not a network timing benchmark;
the public JSON still downloads on the first data load. The following section
records the later split of each photo archive into separate assets.

## On-demand location photo archives (2026-11-23)

The prebuild validates the full publication gate before producing the public
catalogue, then stores one signature cover in each of the 582 browse records.
The other verified photos stay in a separate content-hashed archive for their
own location. Detail pages load that archive; hovering a card loads the archive
metadata for its slow image rotation. Failed images retry the direct original
and then other images from the same location, preserving attribution and source
links.

`npm run build` passed. The public catalogue is **4,553,408 bytes raw / 631,178
bytes gzip / 370,082 bytes Brotli**, down from 9,282,418 raw / 1,032,902 gzip
bytes. All **582** location archives total 5,823,846 bytes raw; the largest is
44,449 bytes. The generated catalogue still reports **582 locations, 3,211
verified photos, 685 photographers, and 70 provinces**. In a local Chromium
preview, the Wat Arun detail page loaded all 12 verified photos and displayed
12/12 photo credits while keeping the signature cover and source attribution.
The deployed Pages production URL returned HTTP 200 for the app, catalogue and
Wat Arun archive. Both hashed data assets returned Brotli encoding and
`Cache-Control: public, max-age=31536000, immutable`.

## UX/UI and motion pass (2026-11-23)

Added [`MASTER_PROMPT_UX_UI_MOTION.md`](MASTER_PROMPT_UX_UI_MOTION.md) and linked
it from the product master prompt. Applied its first pass to the main navigation
and location photo previews: desktop keeps the five main discovery routes visible
and moves secondary routes into a keyboard-operable “More” menu; photo previews
rotate only while hovered or keyboard-focused, visible, and in view. A small
counter identifies the current photo, and the counter text follows the selected
language. Popovers use a brief entrance animation; reduced-motion preferences
disable those animations and image scaling.

`npm run build` passed. Manual Chromium inspection at **1024×768** showed no
header overlap and all routes in the secondary menu; inspection at **390×844**
showed the home page within the viewport and the mobile menu exposed all routes.
The Impeccable detector returned no findings for the changed UI files. Reduced
motion and the animated keyboard photo preview were not manually exercised.

## Product-wide prompt and recovery pass (2026-11-23)

Replaced the old feature-specific master prompt with a reusable product-wide
standard covering data truth, image rights, all browse and planning flows,
localization, accessibility, security, resilience, performance, SEO and release
verification. Added links from the README and an npm command for the existing
directory-cover audit. The image audit measures directory records with an
embedded non-stock cover URL; it does not prove that an image currently loads,
depicts the named place, or has reuse permission.

Last audit output from `npm run audit:directory-covers`:

| Directory | Entries with cover URL | Entries | Missing/stock |
| --- | ---: | ---: | ---: |
| Core location catalogue | 582 | 582 | 0 |
| Second-hand | 56 | 224 | 168 |
| Food | 518 | 595 | 77 |
| Activities | 1,112 | 1,657 | 545 |
| Studios | 12 | 37 | 25 |
| Live music posters | 19 | 39 | 20 |
| Cave collection leads | 99 | 159 | 60 |
| Art collection leads | 22 | 29 | 7 |
| Temple collection leads | 71 | 71 | 0 |
| Nakhon Pathom collection leads | 133 | 133 | 0 |

Directory cards now retain each record's own source link in their image-unavailable
state, so visitors can inspect the source when a cover is absent or fails to
load. The application crash screen no longer exposes raw exception text or
claims that local data is intact; it provides translated recovery actions and
a reference ID that is logged with the diagnostic in the browser console.

## Directory resilience, loading and localization pass (2026-11-23)

Moved the 666.06 KB directory-cover index out of the route JavaScript and into a
separate content-hashed JSON asset. The browser now fetches and caches it with
TanStack Query; cards show a localized loading, unavailable or retry state and
keep the original source link when a cover is missing or fails. Matching and
cover-first ordering now use the same name/province and source-URL fallback.
This removes JavaScript parse/compile work for the image index, but does not
reduce the JSON asset's 82.80 KB gzip transfer when it is requested.

Activity, food, secondhand and collection directories now initially render up
to 48 cards at a time, with a localized load-more control. English labels and
province names are used on the activity, food, secondhand and live-music pages.
The collection page also paginates both published locations and public-source
leads. Live-music events without a poster, or with a poster that fails to load,
show an explicit poster state instead of a blank slot. Loading and crash
recovery screens now follow the selected language.

`npm run audit:directory-covers` now matches by exact name/province or source
URL, checks local asset paths, and separates absent cover URLs from missing
source, credit and explicit license metadata. The latest directory counts are:

| Directory | With cover URL | Entries | Missing URLs | Missing explicit license metadata |
| --- | ---: | ---: | ---: | ---: |
| Core published locations | 582 | 582 | 0 | 0 |
| Secondhand | 56 | 224 | 168 | 56 |
| Food | 518 | 595 | 77 | 518 |
| Activities | 1,100 | 1,620 | 520 | 1,100 |
| Studios | 12 | 37 | 25 | 12 |
| Live music posters | 19 | 39 | 20 | 19 |
| Cave collection leads | 99 | 159 | 60 | 99 |
| Art collection leads | 22 | 29 | 7 | 22 |
| Temple collection leads | 71 | 71 | 0 | 71 |
| Nakhon Pathom collection leads | 133 | 133 | 0 | 133 |

These figures are URL/data-field coverage only. They do not prove that each
remote image loads for every visitor, depicts the named venue, or has permission
for reuse. Local Nakhon Pathom cover paths were checked for file existence. The
remote URL health check is optional and sample-based; no exhaustive external
image check was completed in this environment. The cover gaps and missing
license metadata remain visible work, not completed image coverage.

Validation: production `npm run build` passed. Manual Chromium preview showed 48
initial cards on the food, activities and secondhand pages; the secondhand load
button increased the visible count to 96 and updated the remaining count. The
English province selector included Bangkok and Nakhon Pathom in English. The
cave collection rendered with a load-more control. No console errors appeared
on these routes. `git diff --check` and a duplicate-key check for `en.json`
passed. Build still warns about the separate MapLibre (~1.05 MB raw) and
admin-only data (~10.82 MB raw) chunks; this pass did not reduce their sizes.
The production preview smoke now waits for each route's expected heading rather
than sampling the temporary catalogue-loading heading. `npm run verify:preview`
passed all eight page routes and confirmed the MapLibre canvas mounted.

# FRAMEHUNT THAILAND — Master Prompt for Product Development

Use this prompt when improving the existing Framehunt Thailand product. Work in
the current repository; do not rebuild it as a new concept or replace the product
with a mockup.

## Mission

Make Framehunt the most useful Thai-first place discovery guide for music-video,
film, photography and everyday travel. Help people find a real place, understand
what it looks and feels like, see useful photos, plan a visit and check access
details without mistaking an unverified lead for a confirmed fact.

## Know the product before changing it

- This is an existing React 19, TypeScript, Vite and React Router application
  deployed on Cloudflare Pages. Keep its current data formats, routes and user
  features unless the task requires a specific change.
- The product has a strict published location catalogue, plus separate discovery
  directories for activities, restaurants, second-hand shops, studios and music
  venues. These are different evidence levels and must be labelled honestly.
- Current production inventory is **3,025 unique listings** across those sources.
  The core photo-and-coordinate publication gate currently has **582 locations**,
  **3,211 verified photos**, and **685 credited photographers**. Nakhon Pathom's
  collection currently shows **142 entries**. Recalculate these values from the
  actual source data; never type them as permanent marketing constants.
- The published core dataset requires verified coordinates, evidence and at least
  five unique, licensed, location-specific photos. A directory lead with a cover
  image is not automatically a fully verified core location.
- Supabase is optional in this checkout. If it is not configured, the site uses
  its bundled catalogue and browser-local favourites/boards. Do not claim hosted
  authentication, persistence or live data unless a real connection was checked.
- The user selected a **soft glassmorphism + clay** visual direction. Preserve
  its pale glass surfaces, sage/lilac/peach accents, rounded clay controls and
  strong readable dark text. Do not revert to the older black-and-acid brutalist
  direction or introduce a generic dashboard kit.

## Product and content rules

1. Show real places and correctly attributed images. Never fabricate a place,
   image, permission, opening status, price, coordinate or event schedule.
2. Keep these states distinct: published and fully verified; directory lead with
   a source; needs permission; unknown; restricted. Public access does not prove
   commercial filming permission.
3. Choose a cover that shows the place's recognizable signature view. Keep image
   credit, source, licence and photographer details accessible wherever the image
   is shown. Never silently substitute a photo of another place.
4. Keep user-requested additions in the appropriate browse experience and include
   useful on-page details, photos, province and a source when available. Avoid
   duplicates by matching normalized name and province, with stronger identity
   evidence such as coordinates or source IDs when available.
5. Make every count traceable to the data it describes. Label aggregate directory
   listings separately from locations that pass the full publication gate.
6. Keep travel safety visible: tell visitors when to confirm hours, access,
   permission, weather, closures or event schedules with the responsible source.

## Visual system

Use the existing brand tokens unless a measured contrast or usability problem
requires a change:

- **Frost glass** `#F8FAFF` and **soft blue** `#EDF1F9` for the page surfaces.
- **Slate** `#243143` and **concrete** `#526175` for readable text.
- **Evergreen** `#315C53` for primary actions and active states.
- **Sage** `#DCECE4`, **lilac** `#E8E2F7`, and **peach** `#F5E5DD` for restrained
  category accents.
- **Plus Jakarta Sans** leads display headings; **IBM Plex Sans Thai** supports
  Thai reading and interface text.

Use real location photography as the signature visual. Keep hierarchy clear,
align content to a deliberate grid, and use cards where they help compare actual
places. Motion should respond to user input, remain subtle, and respect reduced
motion. Maintain visible keyboard focus, useful alt text, readable contrast and
touch targets on mobile.

## Performance and reliability

- Prioritize one representative hero image; reserve its dimensions and fetch it
  eagerly. Use responsive thumbnails and native lazy loading for below-the-fold
  images.
- Do not load map libraries or map tiles before the map is near the viewport or
  the visitor opens a map route. Reserve the map's space and give it a useful
  loading state.
- Keep initial JavaScript and image bytes small. Measure the actual built assets
  and live page rather than assuming a lazy import worked.
- A failed photo must not look like a blank card indefinitely. Retry a valid
  alternate from that same place when possible, then show a clear unavailable
  state that preserves the source link.
- Preserve URL-based filters, route navigation, search, language choice,
  favourites, boards, maps, photo credits and existing responsive behaviour.

## How to execute each improvement

1. Inspect the live implementation, data sources, current branch and any local
   project instructions before editing.
2. State the user's job and the highest-impact verified gap in one sentence.
3. Prefer one coherent end-to-end improvement over unrelated cosmetic changes.
   Preserve existing controls and content; do not delete features to make the
   task easier.
4. Implement with the existing framework and style system. Keep scope narrow,
   document source/count changes, and do not expose credentials.
5. Build the production bundle. For visual or interaction changes, inspect the
   affected page at desktop and mobile sizes when browser access is available.
   Report any unavailable checks honestly.
6. Push and deploy when the user has asked for release or the active request
   clearly depends on changing the public site. Confirm the production URL and
   verify the changed behaviour there.
7. In the handoff, distinguish what was implemented, built, pushed, deployed,
   and checked. State any data freshness or external-service limitation.

## Current execution target

Continue first-load performance work without weakening the image-first identity:
serve a content-hashed public catalogue with one signature cover per published
location, then load its verified full photo archive only on card hover or detail
view. Parse the catalogue as data instead of compiling it into the application
JavaScript, and keep draft/review records in the lazy admin route. Preserve the
eager hero cover, deferred homepage map, catalogue counts and search behavior.
When an image fails, retry another verified image from that same place; keep
credits, licences and source links visible, and show a clear unavailable state
if every same-place image fails.

### Acceptance criteria for this pass

- The public catalogue asset contains exactly the published record count in its
  metadata; draft records stay out of the public asset. Each public record has
  one verified cover, the full `photo_count`, and a same-location gallery URL.
- All published photo archives are content-hashed, validated against the full
  publication gate before splitting, served with immutable caching, and fetched
  only on hover or when a location detail page opens. Aggregate verified-photo
  and photographer counts remain based on the full snapshot.
- The published catalogue is a content-hashed static JSON file with long-lived
  immutable caching, and the application entry chunk does not embed that JSON.
- The full review dataset loads only through the admin route. Public location
  counts, search, location detail and directory totals remain correct.
- Keep the hero's eager/high-priority image and the map's near-viewport lazy load.
- Retry a failed cover with the original URL and then another verified image
  from its own location; show a visible failure state rather than a blank image.
- Loading and retry states use the selected readable glass/clay visual system.
- README and verification notes distinguish the 3,025 all-directory listing
  count from the 582-location full publication-gate count.
- Production build succeeds; inspect the affected page in a real browser and
  report any remaining deferred large chunks honestly.

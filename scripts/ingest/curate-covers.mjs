import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { collectPhotos, deriveThumb, nightTitle } from "./commons.mjs";
import { downloadBuffer, hammingHex, slugify } from "./lib.mjs";
import { expansionSeeds } from "./expansion.mjs";

const catalogUrl = new URL("../../src/data/locations.generated.json", import.meta.url);
const reportUrl = new URL("../../data/reports/cover-review.json", import.meta.url);
const cacheDir = new URL("./.cache/cover-v1/", import.meta.url);
await mkdir(cacheDir, { recursive: true });

const hiddenSlugs = new Set(
  expansionSeeds.filter((seed) => seed.wave === "low-key").map((seed) => slugify(seed.name_en)),
);
for (const slug of [
  "saphan-han",
  "khlong-ong-ang",
  "talat-noi",
  "tham-krasae-railway-station",
  "khao-ngu-stone-park",
  "phae-mueang-phi",
  "bangkok-kunsthalle",
  "hua-takhe-railway-station",
  "khlong-phadung-krung-kasem",
  "neilson-hays-library",
  "phitthayasathian-bridge",
  "wat-pariwat",
])
  hiddenSlugs.add(slug);
// Leave heavily visited destinations and sites with more uncertain access out of the editorial shortlist.
for (const slug of [
  "mae-kampong",
  "samut-prakan-ancient-city",
  "bangkok-corrections-museum",
  "makkasan-railway-factory",
  "khao-lom-muak",
  "bang-khun-phrom-palace",
  "phlaeng-fai-fort",
  "khao-yai-art-forest",
])
  hiddenSlugs.delete(slug);

const citySlugs = new Set(expansionSeeds.filter((seed) => seed.night).map((seed) => slugify(seed.name_en)));
const nightExisting = [
  "yaowarat-road",
  "khaosan-road",
  "khlong-ong-ang",
  "talat-noi",
  "song-wat-road",
  "mahanakhon",
  "baiyoke-tower-ii",
  "robot-building",
  "rama-viii-bridge",
  "sathorn-bridge",
  "rama-ix-bridge",
  "memorial-bridge-bangkok",
  "pattaya-beach",
  "patong-beach",
  "hua-lamphong-railway-station",
  "pak-khlong-talat",
  "phra-pinklao-bridge",
  "bhumibol-bridge",
  "charoen-krung-road",
];
nightExisting.forEach((slug) => citySlugs.add(slug));

// Keep portraits and political appearances out of the location cover slot.
function isPlaceCover(photo) {
  return !/portrait|prime.minister|politician|abhisit|vejjajiva|thaksin|shinawatra|yingluck|prayut|chan.o.cha|นายกรัฐมนตรี|นักการเมือง|อภิสิทธิ์|ทักษิณ|ชินวัตร|ประยุทธ์/i.test(
    photo.title,
  );
}

const genericWords = new Set([
  "bangkok",
  "thailand",
  "photo",
  "file",
  "station",
  "temple",
  "museum",
  "building",
  "park",
  "the",
  "with",
  "road",
  "city",
  "center",
  "buddhist",
  "railway",
]);
function signatureScore(photo, location) {
  const title = photo.title.normalize("NFKC").toLowerCase();
  const locationTokens = String(location.name_en)
    .toLowerCase()
    .split(/[^a-z]+/);
  const cues = [...new Set(locationTokens.filter((token) => token.length >= 3 && !genericWords.has(token)))];
  const cueScore = cues.filter((token) => new RegExp(`\\b${token}\\b`).test(title)).length * 5;
  const thaiName = location.name_th.replace(/\s*\(.+\)$/, "").trim();
  const thaiScore = thaiName.length >= 5 && title.includes(thaiName.toLowerCase()) ? 13 : 0;
  const contextScore =
    /street view|exterior|facade|façade|interior|main hall|from across|entrance hall|platform|front view|atrium|wide view/i.test(
      title,
    )
      ? 7
      : 0;
  const documentaryPenalty =
    /press conference|opening ceremony|demonstration|official visit|group photo|award ceremony|nameplate|commemorative plaque/i.test(
      title,
    )
      ? 32
      : 0;
  return Math.min(16, cueScore + thaiScore) + contextScore - documentaryPenalty;
}

function titleScore(photo, venue) {
  let score = 0;
  if (
    /panorama|skyline|aerial|wide view|overview|from above|exterior|facade|façade|reflection|main hall|front view/i.test(
      photo.title,
    )
  )
    score += 10;
  if (/sunset|sunrise|blue hour|twilight|golden hour/i.test(photo.title)) score += 6;
  if (
    /close.?up|detail|notice|signboard|ticket|poster|entrance sign|portrait|selfie|camera test|restoration|construction|food|dish/i.test(
      photo.title,
    )
  )
    score -= 21;
  if (/stage|audience|interior/i.test(photo.title)) score += venue ? 8 : -5;
  if (/black.and.white|monochrome|historical photo/i.test(photo.title)) score -= 7;
  if (photo.is_cover) score += 1.5;
  const ratio = photo.width / photo.height;
  if (ratio >= 1.35 && ratio <= 2.15) score += 10;
  else if (ratio < 1) score -= 16;
  else if (ratio > 2.7) score -= 7;
  score += Math.min(6, (photo.width || 0) / 400);
  return score;
}

function hasNightCaption(photo) {
  return (
    nightTitle.test(photo.title) ||
    nightTitle.test(photo.subject_evidence) ||
    photo.verification_checks.includes("night-caption-confirmed")
  );
}

async function imageFeatures(photo) {
  const key = createHash("sha1")
    .update(photo.checksum ?? photo.original_url)
    .digest("hex");
  const file = new URL(`${key}.json`, cacheDir);
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    const image = await downloadBuffer(deriveThumb(photo.thumb_url, 250), { maxBytes: 1_000_000, retries: 0 });
    const { data, info } = await sharp(image)
      .rotate()
      .resize(64, 48, { fit: "inside" })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const luminance = [];
    let dark = 0;
    let bright = 0;
    let clipping = 0;
    let color = 0;
    let edge = 0;
    let centerEdge = 0;
    let centerPixels = 0;
    for (let index = 0; index < data.length; index += 3) {
      const [r, g, b] = data.subarray(index, index + 3);
      const light = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const pixel = index / 3;
      const x = pixel % info.width;
      const y = Math.floor(pixel / info.width);
      const localEdge = x ? Math.abs(light - luminance[pixel - 1]) : 0;
      luminance.push(light);
      if (light < 42) dark += 1;
      if (light > 148) bright += 1;
      if (light > 245) clipping += 1;
      if (light > 32 && Math.max(r, g, b) - Math.min(r, g, b) > 40) color += 1;
      edge += localEdge;
      if (x > info.width * 0.18 && x < info.width * 0.82 && y > info.height * 0.18 && y < info.height * 0.82) {
        centerEdge += localEdge;
        centerPixels += 1;
      }
    }
    const ordered = luminance.sort((a, b) => a - b);
    const count = ordered.length;
    const contrast = ordered[Math.floor(count * 0.9)] - ordered[Math.floor(count * 0.1)];
    const averageEdge = edge / count;
    const result = {
      visualScore:
        Math.min(17, contrast / 10) +
        Math.min(10, averageEdge * 0.65) +
        Math.min(5, Math.max(0, centerEdge / Math.max(1, centerPixels) - averageEdge) * 0.7) +
        Math.min(4, (color / count) * 7) -
        Math.max(0, clipping / count - 0.18) * 35 -
        Math.max(0, dark / count - 0.78) * 55,
      nightLook:
        dark / count > 0.27 &&
        bright / count > 0.065 &&
        color / count > 0.12 &&
        ordered[Math.floor(count * 0.5)] < 83 &&
        contrast > 92,
    };
    await writeFile(file, JSON.stringify(result));
    return result;
  } catch {
    return null;
  }
}

const signatureSources = {
  "baan-dam-museum": { category: "Main Sanctuary Hall, Baandam", limit: 4 },
  "thai-human-imagery-museum": {
    category: "Sculptures of Phra Aphai Mani, Thai Human Imagery Museum",
    limit: 3,
  },
};

async function addSignaturePhotos(location) {
  const target = signatureSources[location.slug];
  if (!target || location.photos.some((photo) => photo.id.startsWith(location.slug + "-signature-"))) return;
  try {
    const { photos } = await collectPhotos({
      ...target,
      slug: location.slug + "-signature",
      strict: true,
    });
    for (const photo of photos) {
      if (
        location.photos.some(
          (current) =>
            current.id === photo.id ||
            current.checksum === photo.checksum ||
            current.original_url === photo.original_url ||
            (current.perceptual_hash &&
              photo.perceptual_hash &&
              hammingHex(current.perceptual_hash, photo.perceptual_hash) <= 6),
        )
      )
        continue;
      location.photos.push({
        ...photo,
        is_cover: false,
        verification_checks: [...photo.verification_checks, "signature-source"],
      });
      location.photo_count += 1;
    }
  } catch {
    console.log(`Signature photos unavailable for ${location.slug}`);
  }
}

async function review(location) {
  if (withSignatures) await addSignaturePhotos(location);
  const venue = location.location_type === "music venue";
  const city = citySlugs.has(location.slug) || location.categories.includes("neon-night");
  if (city && enrich && location.commons_category && !location.photos.some(hasNightCaption)) {
    try {
      const { photos } = await collectPhotos({
        category: location.commons_category,
        slug: location.slug + "-night",
        strict: true,
        limit: 3,
        preferNight: true,
        nightOnly: true,
      });
      for (const photo of photos) {
        const duplicate = location.photos.some(
          (prior) =>
            prior.checksum === photo.checksum ||
            prior.original_url === photo.original_url ||
            (prior.perceptual_hash &&
              photo.perceptual_hash &&
              hammingHex(prior.perceptual_hash, photo.perceptual_hash) <= 6),
        );
        if (duplicate) continue;
        location.photos.push({ ...photo, is_cover: false });
        location.photo_count += 1;
      }
    } catch {
      console.log(`Night photos unavailable for ${location.slug}; kept the verified gallery`);
    }
  }
  const candidates = location.photos
    .filter((photo) => photo.is_verified && isPlaceCover(photo))
    .map((photo) => ({
      photo,
      base: titleScore(photo, venue) + signatureScore(photo, location),
      captionNight: hasNightCaption(photo),
    }));
  candidates.sort((a, b) => b.base + (city && b.captionNight ? 28 : 0) - (a.base + (city && a.captionNight ? 28 : 0)));
  const ranked = [];
  for (const candidate of candidates.slice(0, city ? 5 : 3)) {
    const features = await imageFeatures(candidate.photo);
    const nightEvidence = city && (candidate.captionNight || features?.nightLook);
    ranked.push({
      ...candidate,
      readable: Boolean(features),
      nightEvidence: Boolean(nightEvidence),
      score: candidate.base + (features?.visualScore ?? 0) + (nightEvidence ? (candidate.captionNight ? 33 : 23) : 0),
    });
  }
  ranked.sort((a, b) => b.score - a.score);
  return {
    slug: location.slug,
    ranked,
    options: candidates.length,
    nightEvidence: ranked.some((item) => item.readable && item.nightEvidence),
  };
}

const dataset = JSON.parse(await readFile(catalogUrl, "utf8"));
const applying = process.argv.includes("--apply");
const enrich = applying && process.argv.includes("--enrich-night");
const withSignatures = applying && process.argv.includes("--signature-assets");
const locations = dataset.locations.filter((item) => item.status === "published");
const results = Array(locations.length);
let cursor = 0;
let done = 0;
async function worker() {
  while (cursor < locations.length) {
    const index = cursor++;
    results[index] = await review(locations[index]);
    done += 1;
    if (done % 25 === 0) console.log(`Reviewed ${done}/${locations.length} locations`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

const pinnedUrl = new URL("./cover-picks.json", import.meta.url);
let pinned = {};
try {
  pinned = JSON.parse(await readFile(pinnedUrl, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

let changed = 0;
let nightTagged = 0;
const selected = results.map((result, index) => {
  const location = locations[index];
  if (hiddenSlugs.has(location.slug)) {
    location.categories = [...new Set([...location.categories, "hidden-frames"])];
    location.tags = [...new Set([...location.tags, "hidden-frames"])];
  }
  const original = location.photos.find((p) => p.is_cover) ?? location.photos[0];
  const choice = pinned[location.slug];
  const handPick = location.photos.find((photo) => photo.id === choice?.id && photo.is_verified && isPlaceCover(photo));
  const nightEvidence = result.nightEvidence || Boolean(handPick && choice?.night);
  const cover =
    handPick ??
    result.ranked.find((r) => r.readable)?.photo ??
    (isPlaceCover(original) ? original : result.ranked[0]?.photo) ??
    original;
  if (cover.id !== original.id) changed += 1;
  if (nightEvidence && !location.categories.includes("neon-night")) {
    location.categories.push("neon-night");
    nightTagged += 1;
  }
  if (location.categories.includes("neon-night") && !location.tags.includes("neon-night")) {
    location.tags.push("neon-night");
  }
  for (const photo of location.photos) photo.is_cover = photo.id === cover.id;
  location.photos = [cover, ...location.photos.filter((photo) => photo.id !== cover.id)];
  return {
    slug: result.slug,
    cover_id: cover.id,
    source: cover.source_page_url,
    image_checks: result.ranked.filter((r) => r.readable).length,
    night_evidence: nightEvidence,
    picked_by: handPick ? "editor" : result.ranked.some((item) => item.readable) ? "scored-images" : "retained",
  };
});

const summary = {
  evaluated: selected.length,
  visual_checked: selected.filter((item) => item.image_checks > 0).length,
  changed,
  night_tagged: nightTagged,
  hidden_total: locations.filter((item) => item.categories.includes("hidden-frames")).length,
  night_photos_added: locations
    .flatMap((item) => item.photos)
    .filter((photo) => photo.verification_checks.includes("night-caption-confirmed")).length,
  night_total: locations.filter((item) => item.categories.includes("neon-night")).length,
};
if (applying) {
  const photos = locations.flatMap((record) => record.photos);
  const licenses = {};
  for (const photo of photos) licenses[photo.license] = (licenses[photo.license] ?? 0) + 1;
  dataset.meta.verified_photos = photos.length;
  dataset.meta.photographers = new Set(photos.map((photo) => photo.photographer)).size;
  dataset.meta.license_breakdown = licenses;
  const ingestUrl = new URL("../../data/reports/ingest-report.json", import.meta.url);
  const ingestReport = JSON.parse(await readFile(ingestUrl, "utf8"));
  ingestReport.counts.verified_photos = photos.length;
  ingestReport.license_breakdown = licenses;
  const photoCounts = new Map(locations.map((location) => [location.slug, location.photo_count]));
  for (const item of ingestReport.published_locations) item.photos = photoCounts.get(item.slug);
  const manifest = dataset.locations.map((record) => ({
    slug: record.slug,
    photos: record.photos.map(
      ({ source_page_url, photographer, license, license_url, checksum, perceptual_hash, is_verified }) => ({
        source_page_url,
        photographer,
        license,
        license_url,
        checksum,
        perceptual_hash,
        is_verified,
      }),
    ),
  }));
  await writeFile(ingestUrl, JSON.stringify(ingestReport, null, 2));
  await writeFile(
    new URL("../../data/reports/photo-manifest.json", import.meta.url),
    JSON.stringify(manifest, null, 2),
  );
  await writeFile(catalogUrl, JSON.stringify(dataset, null, 2));
  await writeFile(reportUrl, JSON.stringify({ checked_at: new Date().toISOString(), ...summary, selected }, null, 2));
}
console.log(JSON.stringify(summary));

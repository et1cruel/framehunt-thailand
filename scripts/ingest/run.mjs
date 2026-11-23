#!/usr/bin/env node
/**
 * FRAMEHUNT ingestion run.
 *
 *   DISCOVER → FETCH PERMITTED METADATA → NORMALIZE → DEDUPLICATE →
 *   VERIFY LOCATION → COLLECT LICENSED PHOTOS → VERIFY PHOTOS →
 *   CHECK PUBLIC ACCESS → ADMIN REVIEW QUEUE → PUBLISH
 *
 * Publication gate: >= 5 verified photos + verified coordinates + a source.
 * Nothing is invented to hit a quota. The report states real counts.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { seeds } from "./seeds.mjs";
import { expansionSeeds } from "./expansion.mjs";
import { resolveEntity } from "./wikidata.mjs";
import { collectPhotos } from "./commons.mjs";
import { slugify } from "./lib.mjs";

const OUT_DATA = path.resolve("src/data/locations.generated.json");
const OUT_REPORT = path.resolve("data/reports/ingest-report.json");
const OUT_MANIFEST = path.resolve("data/reports/photo-manifest.json");
const ID_CACHE = path.resolve("scripts/ingest/.cache/ids.json");

const taxonomy = JSON.parse(await readFile(path.resolve("src/data/taxonomy.json"), "utf8"));
const provinces = JSON.parse(await readFile(path.resolve("src/data/provinces.json"), "utf8")).provinces;

const validCategories = new Set(taxonomy.categories.map((c) => c.slug));
const validMoods = new Set(taxonomy.moods.map((m) => m.slug));
const provinceByName = new Map(provinces.map((p) => [p.name_en, p]));

const MIN_PHOTOS = 5;
const CONCURRENCY = 3;

async function readSnapshot(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}

async function loadIdCache() {
  try {
    return JSON.parse(await readFile(ID_CACHE, "utf8"));
  } catch {
    return {};
  }
}

function stableId(qid, slug) {
  const h = createHash("sha1")
    .update(qid || slug)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

const CREATIVE = {
  urban: {
    shots: [
      "Wide establishing shot from across the street",
      "Slow push-in through a doorway or corridor",
      "Low-angle hero frame against concrete or steel",
      "Detail montage: signage, texture, cables",
    ],
    palette: ["#101010", "#3A3A38", "#858585", "#D7FF39"],
  },
  art: {
    shots: [
      "Centred symmetrical frame of the facade",
      "Handheld walk-through of the gallery",
      "Profile silhouette against a large artwork",
      "Macro details of material and lighting fixtures",
    ],
    palette: ["#F3F0E9", "#101010", "#FF6535", "#C9C4B8"],
  },
  nature: {
    shots: [
      "Wide landscape with a human figure for scale",
      "Backlit silhouette at golden hour",
      "Slow aerial reveal (only with a valid drone permit)",
      "Texture insert: water, rock, mist",
    ],
    palette: ["#1B241C", "#5C6B4F", "#B9C3A6", "#F3F0E9"],
  },
  historical: {
    shots: [
      "Symmetrical front elevation",
      "Detail pass across carving and patina",
      "Silhouette in a doorway or arch",
      "Wide frame with sky negative space",
    ],
    palette: ["#2B2118", "#8A6A3F", "#D9C7A3", "#101010"],
  },
};

function categoryGroup(slugs) {
  for (const group of ["historical", "nature", "art", "urban"]) {
    if (slugs.some((s) => taxonomy.categories.find((c) => c.slug === s)?.group === group)) {
      return group;
    }
  }
  return "urban";
}

const TYPE_TH = {
  temple: "วัด",
  "place of worship": "ศาสนสถาน",
  architecture: "อาคาร",
  "industrial site": "โครงสร้างอุตสาหกรรม",
  mountain: "ภูเขา",
  cityscape: "จุดถ่ายวิวเมือง",
  "music venue": "สถานที่จัดดนตรี",
  canyon: "พื้นที่ภูมิประเทศแบบโตรกผา",
  palace: "พระราชวัง",
  "art centre": "ศูนย์ศิลปะ",
  "creative park": "พื้นที่สร้างสรรค์",
  "creative space": "พื้นที่สร้างสรรค์",
  "art space": "พื้นที่ศิลปะ",
  neighbourhood: "ย่าน",
  street: "ถนน",
  museum: "พิพิธภัณฑ์",
  "railway station": "สถานีรถไฟ",
  market: "ตลาด",
  park: "สวนสาธารณะ",
  monument: "อนุสาวรีย์",
  island: "เกาะ",
  "green area": "พื้นที่สีเขียว",
  "coastal recreation area": "พื้นที่พักผ่อนชายทะเล",
  garden: "สวน",
  "open-air museum": "พิพิธภัณฑ์กลางแจ้ง",
  "historical park": "อุทยานประวัติศาสตร์",
  "ancient temple": "โบราณสถาน",
  cave: "ถ้ำ",
  "national park": "อุทยานแห่งชาติ",
  town: "เมือง",
  beach: "หาด",
  bay: "อ่าว",
  islands: "หมู่เกาะ",
  waterfall: "น้ำตก",
  bridge: "สะพาน",
  lake: "ทะเลสาบ",
  village: "หมู่บ้าน",
};

const pendingLocationReview = new Set([
  "bangkok-corrections-museum", // Gallery overlaps the park at the former prison.
  "khlong-saen-saep", // The structured coordinate is outside the city and does not identify a shootable segment.
  "phra-khanong-canal", // Most sourced images identify the adjacent Wat Mahabut.
  "wat-chong-kham", // The gallery largely repeats the neighbouring Wat Chong Klang.
]);

function buildRecord(seed, resolved, photos, now) {
  const province = provinceByName.get(seed.province);
  if (!province) throw new Error(`unknown province: ${seed.province}`);

  const slug = slugify(seed.name_en);
  const categories = [...new Set(seed.categories)].filter((c) => validCategories.has(c));
  const moods = Object.entries(seed.moods || {})
    .filter(([m]) => validMoods.has(m))
    .map(([slugName, score]) => ({ slug: slugName, relevance_score: Math.min(1, Math.max(0, score)) }))
    .sort((a, b) => b.relevance_score - a.relevance_score);

  const verifiedPhotos = photos.filter((p) => p.is_verified);
  const published = verifiedPhotos.length >= MIN_PHOTOS && !pendingLocationReview.has(slug);

  const thExtract = resolved.extract_th?.text || "";
  const enExtract = resolved.extract_en?.text || "";
  const derivedTh = `${seed.name_th} ตั้งอยู่ใน${seed.district ? `เขต/อำเภอ ${seed.district} ` : ""}จังหวัด${province.name_th} เป็น${TYPE_TH[seed.location_type] || seed.location_type} มีพิกัดอ้างอิงจาก Wikidata`;
  const description_th = thExtract || derivedTh;
  const description_en =
    enExtract ||
    `${seed.name_en} is a ${seed.location_type} in ${province.name_en}, Thailand. Coordinates are sourced from Wikidata.`;

  const group = categoryGroup(categories);
  const creative = CREATIVE[group];

  return {
    id: stableId(resolved.qid, slug),
    slug,
    name_th: seed.name_th,
    name_en: seed.name_en,
    description_th,
    description_en,
    description_source: thExtract
      ? { type: "wikipedia", lang: "th", url: resolved.extract_th.url, license: "CC BY-SA 4.0" }
      : { type: "derived", note: "Generated from verified structured fields; not a historical claim." },
    province_id: province.slug,
    province: province.name_en,
    province_th: province.name_th,
    region: province.region,
    zone: province.zone,
    district: seed.district || null,
    address: null,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    coordinate_source: {
      name: "Wikidata",
      url: `https://www.wikidata.org/wiki/${resolved.qid}`,
      property: "P625",
      confidence: resolved.confidence,
    },
    location_type: seed.location_type,
    architectural_style: seed.architectural_style,
    access_status: "unknown",
    filming_permission_status: "unknown",
    estimated_cost: null,
    contact_info: null,
    website_url: resolved.sitelinks.en
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(resolved.sitelinks.en.replace(/ /g, "_"))}`
      : null,
    maps_url: `https://www.google.com/maps/search/?api=1&query=${resolved.latitude},${resolved.longitude}`,
    verified_at: now,
    published_at: published ? now : null,
    status: published ? "published" : "draft",
    created_at: now,
    updated_at: now,
    categories,
    moods,
    photos,
    photo_count: verifiedPhotos.length,
    sources: [
      {
        source_url: `https://www.wikidata.org/wiki/${resolved.qid}`,
        source_type: "wikidata",
        field_verified: "coordinates,name,description",
        checked_at: now,
      },
      ...(resolved.commonsCategory
        ? [
            {
              source_url: `https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(resolved.commonsCategory.replace(/ /g, "_"))}`,
              source_type: "wikimedia-commons",
              field_verified: "photos,license,attribution",
              checked_at: now,
            },
          ]
        : []),
      ...(resolved.extract_th
        ? [
            {
              source_url: resolved.extract_th.url,
              source_type: "wikipedia-th",
              field_verified: "description",
              checked_at: now,
            },
          ]
        : []),
    ],
    permission: {
      permission_status: "unknown",
      contact_details: null,
      permission_source: null,
      restrictions: null,
      verified_at: null,
      note: "ยังไม่มีข้อมูลยืนยัน — ต้องติดต่อหน่วยงานหรือเจ้าของพื้นที่ก่อนถ่ายทำเชิงพาณิชย์",
    },
    filming: {
      mv_suitability: null,
      music_genres: [],
      recommended_angles: creative.shots,
      best_light_window: null,
      artificial_light_allowed: "unknown",
      large_equipment_allowed: "unknown",
      drone_allowed: "unknown",
      drone_note: "ต้องตรวจสอบกฎการบินและการอนุญาตเพิ่มเติม — ไม่ถือว่าได้รับอนุญาตโดยปริยาย",
      sound_restrictions: "unknown",
      dressing_room: "unknown",
      parking: "unknown",
      crew_size: "unknown",
    },
    creative: {
      suggested_moods: moods.slice(0, 3).map((m) => m.slug),
      shot_types: creative.shots,
      palette: creative.palette,
      light_window_note: "ยังไม่มีข้อมูลยืนยัน — ต้องสำรวจหน้างานหรือใช้ข้อมูลทิศทางแสงที่ตรวจสอบได้",
    },
    tags: categories,
    qid: resolved.qid,
    commons_category: resolved.commonsCategory,
    needs_admin_review: !published,
  };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const now = new Date().toISOString();
  const idCache = await loadIdCache();
  const expanding = process.argv.includes("--expand");
  const retryDrafts = expanding && process.argv.includes("--retry-drafts");
  const previous = await readSnapshot(OUT_DATA);
  const previousReport = await readSnapshot(OUT_REPORT);
  const records = previous?.locations ?? [];
  const originalIds = new Set(records.map((record) => record.id));
  const stagedInput = process.env.FRAMEHUNT_INCLUDE_STAGE;
  const staged = stagedInput ? JSON.parse(await readFile(stagedInput, "utf8")) : null;
  const rejections = [...(staged?.rejections ?? [])];
  const photoRejections = [...(staged?.photoRejections ?? [])];
  const normalized = (name) =>
    String(name ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  for (const item of staged?.additions ?? []) {
    const duplicate = records.some((current) => {
      if (current.qid === item.qid || current.slug === item.slug) return true;
      if (current.province_id !== item.province_id) return false;
      if (current.commons_category && normalized(current.commons_category) === normalized(item.commons_category))
        return true;
      return (
        Math.abs(current.latitude - item.latitude) < 0.001 &&
        Math.abs(current.longitude - item.longitude) < 0.001 &&
        (normalized(current.name_th) === normalized(item.name_th) ||
          normalized(current.name_en) === normalized(item.name_en))
      );
    });
    if (duplicate) continue;
    records.push(item);
  }
  const locationIds = new Set(records.map((record) => record.qid));
  const positionsBySlug = new Map(records.map((record, index) => [record.slug, index]));
  const startedAt = Date.now();

  const filter = (process.env.SEED_FILTER || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const selectedWaves = ["bangkok-frames", "wild-places", "hidden-thailand", "more-wild-places", "more-wild-places-2", "more-wild-places-3", "more-wild-places-4", "more-wild-places-5", "low-key", "night-music"];
  const activeWaves = selectedWaves.filter((name) => process.argv.includes("--" + name));
  const seedsToUse = (expanding ? expansionSeeds : seeds).filter((seed) => {
    if (activeWaves.length && !activeWaves.includes(seed.wave)) return false;
    const prior = records[positionsBySlug.get(slugify(seed.name_en))];
    return (
      (!prior || (retryDrafts && prior.status === "draft" && prior.photo_count < MIN_PHOTOS)) &&
      (!filter.length || filter.some((value) => seed.name_en.toLowerCase().includes(value)))
    );
  });

  console.log(`▶ FRAMEHUNT ingest — ${seedsToUse.length} seeds`);

  await mapLimit(seedsToUse, CONCURRENCY, async (seed, index) => {
    const label = `[${String(index + 1).padStart(2, "0")}/${seedsToUse.length}] ${seed.name_en}`;
    try {
      const resolved = await resolveEntity(seed);
      if (resolved.error) {
        rejections.push({
          seed: seed.name_en,
          province: seed.province,
          reason: resolved.error,
          confidence: resolved.best?.confidence ?? null,
        });
        console.log(`  ✕ ${label} — ${resolved.error}`);
        return;
      }

      const slug = slugify(seed.name_en);
      const position = positionsBySlug.get(slug);
      const prior = records[position];
      if (prior ? prior.qid !== resolved.qid : locationIds.has(resolved.qid)) {
        console.log(`  ↷ ${label} — already in catalog or ambiguous identity`);
        return;
      }
      locationIds.add(resolved.qid);
      idCache[slug] = resolved.qid;
      const { photos, rejected } = resolved.commonsCategory
        ? await collectPhotos({
            category: resolved.commonsCategory,
            slug,
            strict: seed.strict,
            preferNight: seed.night,
            namedChildren: Boolean(seed.commonsCategory && seed.categories.includes("art-gallery")),
            widerSearch: Boolean(prior?.commons_category),
            limit: seed.strict ? 5 : 12,
          })
        : { photos: [], rejected: [] };

      for (const r of rejected.slice(0, 8)) {
        photoRejections.push({ location: seed.name_en, ...r });
      }

      const record = buildRecord(seed, resolved, photos, now);
      if (prior) {
        if (record.photo_count > prior.photo_count) {
          record.created_at = prior.created_at;
          records[position] = record;
        }
      } else {
        positionsBySlug.set(slug, records.length);
        records.push(record);
      }

      const accepted = records[positionsBySlug.get(slug)];
      const verified = accepted.photo_count;
      const mark = verified >= MIN_PHOTOS ? "✓" : "·";
      console.log(
        `  ${mark} ${label} — ${verified} verified photo(s)${accepted.status === "published" ? " → published" : " → draft"}${resolved.confidence < 70 ? ` (name match ${resolved.confidence}%)` : ""}`,
      );
    } catch (err) {
      rejections.push({ seed: seed.name_en, province: seed.province, reason: `error:${err.message}` });
      console.log(`  ✕ ${label} — ${err.message}`);
    }
  });

  const attempted = new Set([...(staged?.attempted ?? []), ...seedsToUse.map((seed) => seed.name_en)]);
  if (process.env.FRAMEHUNT_WRITE_STAGE) {
    const additions = records.filter((item) => !originalIds.has(item.id));
    await writeFile(
      process.env.FRAMEHUNT_WRITE_STAGE,
      JSON.stringify(
        {
          additions,
          rejections,
          photoRejections,
          attempted: [...attempted],
        },
        null,
        2,
      ),
    );
    console.log(
      `Staged ${additions.length} candidates, ${additions.filter((item) => item.status === "published").length} with verified galleries`,
    );
    return;
  }
  const allRejections = [
    ...(previousReport?.rejections ?? []).filter(
      (item) => !attempted.has(item.seed) && item.reason !== "no-commons-category",
    ),
    ...rejections,
  ];
  const allPhotoRejections = [
    ...(previousReport?.photo_rejections ?? []).filter((item) => !attempted.has(item.location)),
    ...photoRejections,
  ];
  records.sort((a, b) => a.name_en.localeCompare(b.name_en));

  const published = records.filter((r) => r.status === "published");
  const drafts = records.filter((r) => r.status === "draft");
  const totalPhotos = published.reduce((n, r) => n + r.photo_count, 0);
  const draftPhotos = drafts.reduce((n, r) => n + r.photo_count, 0);
  const uniquePhotographers = new Set(published.flatMap((r) => r.photos.map((p) => p.photographer))).size;
  const licenses = published.flatMap((r) => r.photos.map((p) => p.license));
  const licenseBreakdown = licenses.reduce((acc, l) => {
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});

  const dataset = {
    meta: {
      generated_at: now,
      source: "Wikidata + Wikimedia Commons",
      min_photos_required: MIN_PHOTOS,
      total_locations: records.length,
      published: published.length,
      draft: drafts.length,
      rejected: allRejections.length,
      verified_photos: totalPhotos,
      photographers: uniquePhotographers,
      license_breakdown: licenseBreakdown,
      disclaimer:
        "พิกัดและคำอธิบายมีแหล่งอ้างอิงในหน้าสถานที่ และภาพถ่ายมาจาก Wikimedia Commons พร้อมเครดิตและใบอนุญาต สถานะการขออนุญาตถ่ายทำเป็น 'ยังไม่มีข้อมูลยืนยัน' เว้นแต่ระบุไว้ชัดเจน",
    },
    locations: records,
  };

  const report = {
    generated_at: now,
    duration_ms: Date.now() - startedAt,
    counts: {
      seeds: new Set([...seeds, ...expansionSeeds].map((seed) => seed.name_en)).size,
      resolved: records.length,
      published: published.length,
      draft: drafts.length,
      rejected: allRejections.length,
      verified_photos: totalPhotos,
      draft_photos: draftPhotos,
    },
    by_zone: ["A", "B", "C"].map((zone) => ({
      zone,
      published: published.filter((r) => r.zone === zone).length,
      draft: drafts.filter((r) => r.zone === zone).length,
    })),
    by_region: Object.entries(
      records.reduce((acc, r) => {
        acc[r.region] = acc[r.region] || { published: 0, draft: 0 };
        acc[r.region][r.status] += 1;
        return acc;
      }, {}),
    ).map(([region, v]) => ({ region, ...v })),
    license_breakdown: licenseBreakdown,
    rejections: allRejections,
    photo_rejections: allPhotoRejections,
    drafts_awaiting_photos: drafts.map((r) => ({
      slug: r.slug,
      name: r.name_en,
      province: r.province,
      verified_photos: r.photo_count,
      needed: Math.max(0, MIN_PHOTOS - r.photo_count),
    })),
    published_locations: published.map((r) => ({
      slug: r.slug,
      name: r.name_en,
      province: r.province,
      photos: r.photo_count,
      qid: r.qid,
    })),
  };

  await mkdir(path.dirname(OUT_DATA), { recursive: true });
  await mkdir(path.dirname(OUT_REPORT), { recursive: true });
  await writeFile(OUT_DATA, JSON.stringify(dataset, null, 2));
  await writeFile(OUT_REPORT, JSON.stringify(report, null, 2));
  await writeFile(
    OUT_MANIFEST,
    JSON.stringify(
      records.map((r) => ({
        slug: r.slug,
        photos: r.photos.map((p) => ({
          source_page_url: p.source_page_url,
          photographer: p.photographer,
          license: p.license,
          license_url: p.license_url,
          checksum: p.checksum,
          perceptual_hash: p.perceptual_hash,
          is_verified: p.is_verified,
        })),
      })),
      null,
      2,
    ),
  );
  await mkdir(path.dirname(ID_CACHE), { recursive: true });
  await writeFile(ID_CACHE, JSON.stringify(idCache, null, 2));

  console.log("\n── Result ─────────────────────────────");
  console.log(`Published : ${published.length}`);
  console.log(`Draft     : ${drafts.length}`);
  console.log(`Rejected  : ${allRejections.length}`);
  console.log(`Photos    : ${totalPhotos} verified`);
  console.log(`Report    : ${path.relative(process.cwd(), OUT_REPORT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

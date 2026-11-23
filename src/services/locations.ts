import catalogManifestJson from "@/data/generated/catalogManifest.json";
import type { DatasetMeta, LocationRecord, SearchFilters } from "@/data/types";
import { categoryBySlug, moodBySlug } from "@/data/taxonomy";
import { haversineKm } from "@/lib/utils";

export const MIN_VERIFIED_PHOTOS = 5;

export const datasetMeta = catalogManifestJson.meta as DatasetMeta;
export const bundledCatalogAssetUrl = catalogManifestJson.publishedAssetUrl as string;

function verifiedPhotos(loc: LocationRecord) {
  const checksums = new Set<string>();
  const imageUrls = new Set<string>();
  const perceptualHashes = new Set<string>();
  return loc.photos.filter((photo) => {
    if (
      !photo.is_verified ||
      !photo.checksum?.trim() ||
      !photo.photographer.trim() ||
      !photo.license.trim() ||
      !photo.attribution_text.trim() ||
      !photo.image_url.startsWith("https://") ||
      !photo.source_page_url.startsWith("https://") ||
      checksums.has(photo.checksum) ||
      imageUrls.has(photo.original_url) ||
      (photo.perceptual_hash && perceptualHashes.has(photo.perceptual_hash))
    )
      return false;
    checksums.add(photo.checksum);
    imageUrls.add(photo.original_url);
    if (photo.perceptual_hash) perceptualHashes.add(photo.perceptual_hash);
    return true;
  });
}

/** A location is publicly visible only when every publication gate passes. */
export function isPublishable(loc: LocationRecord): boolean {
  return (
    loc.status === "published" &&
    loc.latitude >= 5 &&
    loc.latitude <= 21 &&
    loc.longitude >= 97 &&
    loc.longitude <= 106 &&
    loc.sources.some((source) => source.source_url.startsWith("https://")) &&
    loc.photos.length >= (loc.curated_photo_minimum ?? MIN_VERIFIED_PHOTOS) &&
    verifiedPhotos(loc).length === loc.photos.length
  );
}

export function photoGate(loc: LocationRecord) {
  const verified = verifiedPhotos(loc).length;
  const required = loc.curated_photo_minimum ?? MIN_VERIFIED_PHOTOS;
  return {
    verified,
    required,
    passes: verified >= required,
    missing: Math.max(0, required - verified),
  };
}

function textScore(loc: LocationRecord, tokens: string[]): number {
  if (!tokens.length) return 0;
  const names = [loc.name_th, loc.name_en].map((s) => s.toLowerCase());
  const meta = [
    loc.province,
    loc.province_th,
    loc.district ?? "",
    loc.location_type,
    loc.architectural_style,
    loc.description_th,
    loc.description_en,
    ...loc.categories.map(
      (c) => `${c} ${categoryBySlug.get(c)?.name_th ?? ""} ${categoryBySlug.get(c)?.name_en ?? ""}`,
    ),
    ...loc.moods.map(
      (m) => `${m.slug} ${moodBySlug.get(m.slug)?.name_th ?? ""} ${moodBySlug.get(m.slug)?.name_en ?? ""}`,
    ),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (names.some((n) => n === token)) score += 100;
    else if (names.some((n) => n.startsWith(token))) score += 60;
    else if (names.some((n) => n.includes(token))) score += 40;
    if (meta.includes(token)) score += 14;
  }
  return score;
}

export interface SearchResult {
  location: LocationRecord;
  score: number;
  distanceKm: number | null;
}

export interface Suggestion {
  type: "location" | "province" | "category" | "mood";
  label: string;
  sub: string;
  href: string;
}

export interface VibeMatch {
  location: LocationRecord;
  score: number;
  reasons: string[];
}

const MOOD_GROUP_AFFINITY: Record<string, string[]> = {
  dark: ["urban", "historical"],
  horror: ["urban", "historical"],
  gothic: ["historical", "urban"],
  "post-apocalyptic": ["urban", "nature"],
  dystopian: ["urban"],
  aggressive: ["urban"],
  rage: ["urban"],
  cyberpunk: ["urban"],
  futuristic: ["urban", "art"],
  ethereal: ["nature", "historical"],
  ambient: ["nature"],
  dreamcore: ["nature", "art"],
  surreal: ["art", "nature"],
  experimental: ["art", "urban"],
  minimal: ["art", "urban"],
  nostalgic: ["historical", "urban"],
  romantic: ["nature", "historical"],
  melancholic: ["urban", "nature"],
  lonely: ["urban", "nature"],
  cinematic: ["historical", "nature"],
};

function groupOfLocation(loc: LocationRecord): string {
  for (const group of ["historical", "nature", "art", "urban"]) {
    if (loc.categories.some((c) => categoryBySlug.get(c)?.group === group)) return group;
  }
  return "urban";
}

export function createLocationCatalog(
  records: LocationRecord[],
  generatedAt: string | null,
  bundledStats?: { total: number; draft: number; verifiedPhotos?: number; photographers?: number },
  recordsAreVerifiedPublishedSnapshot = false,
) {
  // The generated public asset is validated against the full publication gate
  // before its photo arrays are split into on-demand gallery files.
  const published = recordsAreVerifiedPublishedSnapshot
    ? records.filter((record) => record.status === "published")
    : records.filter(isPublishable);
  const publishedIds = new Set(published.map((record) => record.id));

  function allRecords(): LocationRecord[] {
    return records;
  }

  function publishedLocations(): LocationRecord[] {
    return published;
  }

  function draftLocations(): LocationRecord[] {
    return records.filter((l) => !publishedIds.has(l.id));
  }

  function getLocation(slug: string): LocationRecord | undefined {
    return publishedLocations().find((l) => l.slug === slug);
  }

  function getLocationIncludingDrafts(slug: string): LocationRecord | undefined {
    return records.find((l) => l.slug === slug);
  }

  function searchLocations(filters: SearchFilters, limit?: number): SearchResult[] {
    const tokens = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const origin = filters.origin;
    const pool = publishedLocations();

    const results: SearchResult[] = [];

    for (const loc of pool) {
      if (filters.province && loc.province_id !== filters.province) continue;
      if (filters.region && loc.region !== filters.region) continue;
      if (filters.categories.length && !filters.categories.some((c) => loc.categories.includes(c))) continue;
      if (filters.moods.length && !filters.moods.some((m) => loc.moods.some((x) => x.slug === m))) continue;
      if (filters.permission && loc.filming_permission_status !== filters.permission) continue;
      if (filters.verifiedOnly && !loc.verified_at) continue;
      if (filters.withPhotosOnly && loc.photo_count < (loc.curated_photo_minimum ?? MIN_VERIFIED_PHOTOS)) continue;

      const distanceKm = origin ? haversineKm(origin, { lat: loc.latitude, lng: loc.longitude }) : null;
      if (filters.radiusKm != null && distanceKm != null && distanceKm > filters.radiusKm) continue;

      let score = textScore(loc, tokens);
      if (tokens.length && score === 0) continue;

      score += loc.photo_count * 0.6;
      score += loc.verified_at ? 6 : 0;
      score += loc.permission.permission_status !== "unknown" ? 10 : 0;
      for (const m of loc.moods) {
        if (filters.moods.includes(m.slug)) score += m.relevance_score * 40;
      }
      if (distanceKm != null) score += Math.max(0, 30 - distanceKm) * 0.6;

      results.push({ location: loc, score, distanceKm });
    }

    switch (filters.sort) {
      case "distance":
        results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
        break;
      case "recent":
        results.sort(
          (a, b) => new Date(b.location.published_at ?? 0).getTime() - new Date(a.location.published_at ?? 0).getTime(),
        );
        break;
      case "photos":
        results.sort((a, b) => b.location.photo_count - a.location.photo_count);
        break;
      default:
        results.sort((a, b) => b.score - a.score || b.location.photo_count - a.location.photo_count);
    }

    return typeof limit === "number" ? results.slice(0, limit) : results;
  }

  function suggest(query: string, limit = 8): Suggestion[] {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const out: Suggestion[] = [];

    for (const loc of publishedLocations()) {
      const hay = `${loc.name_th} ${loc.name_en} ${loc.province_th}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({
          type: "location",
          label: loc.name_th,
          sub: `${loc.name_en} · ${loc.province_th}`,
          href: `/locations/${loc.slug}`,
        });
      }
    }
    for (const c of categoryBySlug.values()) {
      if (`${c.name_th} ${c.name_en} ${c.slug}`.toLowerCase().includes(q)) {
        out.push({ type: "category", label: c.name_th, sub: c.name_en, href: `/explore?categories=${c.slug}` });
      }
    }
    for (const m of moodBySlug.values()) {
      if (`${m.name_th} ${m.name_en} ${m.slug}`.toLowerCase().includes(q)) {
        out.push({ type: "mood", label: m.name_th, sub: `Mood · ${m.name_en}`, href: `/explore?moods=${m.slug}` });
      }
    }

    const seen = new Set<string>();
    return out
      .filter((s) => {
        const key = `${s.type}:${s.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  }

  function nearbyLocations(loc: LocationRecord, limit = 4): { location: LocationRecord; distanceKm: number }[] {
    return publishedLocations()
      .filter((l) => l.id !== loc.id)
      .map((l) => ({
        location: l,
        distanceKm: haversineKm({ lat: loc.latitude, lng: loc.longitude }, { lat: l.latitude, lng: l.longitude }),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  function randomLocation(excludeSlug?: string): LocationRecord | undefined {
    const pool = publishedLocations().filter((l) => l.slug !== excludeSlug);
    if (!pool.length) return undefined;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function findMyVibe(moodSlugs: string[], origin?: { lat: number; lng: number } | null, limit = 12): VibeMatch[] {
    if (!moodSlugs.length) return [];
    const pool = publishedLocations();
    const matches: VibeMatch[] = [];

    for (const loc of pool) {
      let score = 0;
      const reasons: string[] = [];
      const group = groupOfLocation(loc);

      for (const mood of moodSlugs) {
        const entry = loc.moods.find((m) => m.slug === mood);
        if (entry) {
          score += entry.relevance_score * 1.15;
          const label = moodBySlug.get(mood)?.name_th ?? mood;
          if (entry.relevance_score >= 0.7) {
            reasons.push(`คะแนน Mood “${label}” สูงถึง ${Math.round(entry.relevance_score * 100)}%`);
          }
        }
        if (MOOD_GROUP_AFFINITY[mood]?.includes(group)) score += 0.12;
      }

      score += Math.min(loc.photo_count, 12) * 0.012;
      score += loc.verified_at ? 0.05 : 0;
      if (loc.permission.permission_status !== "unknown") score += 0.06;

      let distanceKm: number | null = null;
      if (origin) {
        distanceKm = haversineKm(origin, { lat: loc.latitude, lng: loc.longitude });
        score += Math.max(0, 0.16 - distanceKm / 1000);
        if (distanceKm < 80) reasons.push(`ห่างจากคุณประมาณ ${Math.round(distanceKm)} กม.`);
      }

      if (!reasons.length) {
        const top = loc.moods[0];
        if (top) {
          reasons.push(`บรรยากาศใกล้เคียง: ${moodBySlug.get(top.slug)?.name_th ?? top.slug}`);
        }
      }
      const primaryCat = loc.categories.find((c) => categoryBySlug.get(c)?.group === group);
      if (primaryCat) {
        reasons.push(`สภาพแวดล้อมแบบ${categoryBySlug.get(primaryCat)?.name_th ?? primaryCat}`);
      }
      reasons.push(`${loc.photo_count} ภาพที่ตรวจสอบแล้ว`);

      matches.push({ location: loc, score, reasons: reasons.slice(0, 3) });
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  function locationStats() {
    const all = allRecords();
    const published = publishedLocations();
    const drafts = draftLocations();
    const verifiedPhotoCount = bundledStats?.verifiedPhotos ?? published.reduce((n, l) => n + l.photos.filter((p) => p.is_verified).length, 0);
    const provincesCovered = new Set(published.map((l) => l.province_id)).size;
    return {
      total: bundledStats?.total ?? all.length,
      published: published.length,
      draft: bundledStats?.draft ?? drafts.length,
      verifiedPhotos: verifiedPhotoCount,
      provincesCovered,
      photographers: bundledStats?.photographers ?? new Set(published.flatMap((l) => l.photos.map((p) => p.photographer))).size,
      generatedAt,
    };
  }
  return {
    allRecords,
    publishedLocations,
    draftLocations,
    getLocation,
    getLocationIncludingDrafts,
    searchLocations,
    suggest,
    nearbyLocations,
    randomLocation,
    findMyVibe,
    locationStats,
  };
}

export const emptyCatalog = createLocationCatalog([], datasetMeta.generated_at, {
  total: datasetMeta.total_locations,
  draft: datasetMeta.draft,
  verifiedPhotos: datasetMeta.verified_photos,
  photographers: datasetMeta.photographers,
});

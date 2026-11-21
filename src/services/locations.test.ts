import { describe, expect, it } from "vitest";
import { emptyFilters, type LocationRecord } from "@/data/types";
import {
  MIN_VERIFIED_PHOTOS,
  allRecords,
  datasetMeta,
  draftLocations,
  findMyVibe,
  getLocation,
  isPublishable,
  locationStats,
  nearbyLocations,
  photoGate,
  publishedLocations,
  searchLocations,
  suggest,
} from "@/services/locations";

const published = publishedLocations();
const drafts = draftLocations();
const first = published[0];

function filters(patch: Partial<typeof emptyFilters> = {}) {
  return { ...emptyFilters, ...patch };
}

describe("publish gate", () => {
  it("publishes only records that pass every gate", () => {
    expect(published.length).toBeGreaterThan(0);
    for (const loc of published) {
      expect(loc.status).toBe("published");
      expect(loc.photos.filter((p) => p.is_verified).length).toBeGreaterThanOrEqual(MIN_VERIFIED_PHOTOS);
      expect(loc.photos.length).toBe(loc.photos.filter((p) => p.is_verified).length);
      expect(Number.isFinite(loc.latitude)).toBe(true);
      expect(Number.isFinite(loc.longitude)).toBe(true);
      expect(isPublishable(loc)).toBe(true);
    }
  });

  it("never exposes drafts through the public getter", () => {
    for (const draft of drafts) {
      expect(isPublishable(draft)).toBe(false);
      expect(getLocation(draft.slug)).toBeUndefined();
    }
  });

  it("reports exactly how many photos are missing", () => {
    const empty = drafts.find((d) => d.photos.length === 0);
    expect(empty).toBeDefined();
    if (!empty) return;
    const gate = photoGate(empty);
    expect(gate.passes).toBe(false);
    expect(gate.missing).toBe(MIN_VERIFIED_PHOTOS);
  });

  it("rejects a record that claims published with too few photos", () => {
    const fake: LocationRecord = {
      ...first,
      id: "fake",
      photos: first.photos.slice(0, 2),
      photo_count: 2,
    };
    expect(isPublishable(fake)).toBe(false);
  });

  it("rejects a record with non-numeric coordinates", () => {
    const fake: LocationRecord = { ...first, id: "fake", latitude: Number.NaN };
    expect(isPublishable(fake)).toBe(false);
  });

  it("requires an HTTPS evidence source and coordinates inside Thailand", () => {
    expect(isPublishable({ ...first, sources: [] })).toBe(false);
    expect(isPublishable({ ...first, longitude: 0 })).toBe(false);
  });

  it("does not count duplicate images toward the publication gate", () => {
    const photos = first.photos.slice(0, MIN_VERIFIED_PHOTOS);
    photos[1] = { ...photos[1], original_url: photos[0].original_url };
    expect(isPublishable({ ...first, photos })).toBe(false);
    expect(photoGate({ ...first, photos }).missing).toBe(1);
  });
});

describe("dataset integrity", () => {
  it("matches the generated meta counts", () => {
    expect(allRecords().length).toBe(datasetMeta.total_locations);
    expect(published.length).toBe(datasetMeta.published);
    expect(drafts.length).toBe(datasetMeta.draft);
    const verified = published.reduce((n, l) => n + l.photos.filter((p) => p.is_verified).length, 0);
    expect(verified).toBe(datasetMeta.verified_photos);
  });

  it("has unique slugs and ids", () => {
    expect(new Set(allRecords().map((l) => l.slug)).size).toBe(allRecords().length);
    expect(new Set(allRecords().map((l) => l.id)).size).toBe(allRecords().length);
  });

  it("keeps every coordinate inside Thailand", () => {
    for (const loc of published) {
      expect(loc.latitude).toBeGreaterThan(5);
      expect(loc.latitude).toBeLessThan(21);
      expect(loc.longitude).toBeGreaterThan(97);
      expect(loc.longitude).toBeLessThan(106);
    }
  });

  it("credits every published photo with a photographer, license and source", () => {
    for (const loc of published) {
      for (const photo of loc.photos) {
        expect(photo.photographer.trim().length).toBeGreaterThan(0);
        expect(photo.license.trim().length).toBeGreaterThan(0);
        expect(photo.attribution_text).toContain(photo.photographer);
        expect(photo.source_page_url).toMatch(/^https:\/\//);
        expect(photo.image_url).toMatch(/^https:\/\//);
        expect(photo.thumb_url).toMatch(/^https:\/\//);
        expect(photo.width).toBeGreaterThan(0);
        expect(photo.height).toBeGreaterThan(0);
      }
    }
  });

  it("never repeats a photo inside one location", () => {
    for (const loc of published) {
      const checksums = loc.photos.map((p) => p.checksum).filter((c): c is string => Boolean(c));
      expect(new Set(checksums).size).toBe(checksums.length);
      const hashes = loc.photos.map((p) => p.perceptual_hash).filter((h): h is string => Boolean(h));
      expect(new Set(hashes).size).toBe(hashes.length);
    }
  });

  it("never marks permission as allowed without a source", () => {
    for (const loc of allRecords()) {
      if (loc.permission.permission_status === "allowed") {
        expect(loc.permission.permission_source).toBeTruthy();
        expect(loc.permission.verified_at).toBeTruthy();
      }
    }
  });

  it("does not claim drone permission anywhere", () => {
    for (const loc of allRecords()) {
      expect(loc.filming.drone_allowed).not.toBe("yes");
    }
  });
});

describe("search", () => {
  it("finds a location by its English name", () => {
    const result = searchLocations(filters({ q: first.name_en }));
    expect(result.some((r) => r.location.slug === first.slug)).toBe(true);
  });

  it("filters by province", () => {
    const result = searchLocations(filters({ province: first.province_id }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.location.province_id === first.province_id)).toBe(true);
  });

  it("filters by category", () => {
    const category = first.categories[0];
    const result = searchLocations(filters({ categories: [category] }));
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.location.categories.includes(category))).toBe(true);
  });

  it("never returns unpublished records", () => {
    const draftSlugs = new Set(drafts.map((d) => d.slug));
    const result = searchLocations(filters({ q: "" }));
    expect(result.every((r) => !draftSlugs.has(r.location.slug))).toBe(true);
  });

  it("applies a radius filter and reports distance", () => {
    const origin = { lat: first.latitude, lng: first.longitude };
    const result = searchLocations(filters({ origin, radiusKm: 25, sort: "distance" }));
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item.distanceKm).not.toBeNull();
      expect(item.distanceKm ?? Infinity).toBeLessThanOrEqual(25);
    }
  });

  it("sorts by photo count", () => {
    const result = searchLocations(filters({ sort: "photos" }));
    for (let i = 1; i < result.length; i += 1) {
      expect(result[i - 1].location.photo_count).toBeGreaterThanOrEqual(result[i].location.photo_count);
    }
  });

  it("suggests Thai locations", () => {
    expect(suggest("วัด").length).toBeGreaterThan(0);
  });
});

describe("vibe matching and nearby", () => {
  it("returns scored matches with human reasons", () => {
    const matches = findMyVibe(["dark", "cinematic"]);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.length).toBeLessThanOrEqual(12);
    for (const match of matches) {
      expect(match.reasons.length).toBeGreaterThan(0);
      expect(match.reasons.length).toBeLessThanOrEqual(3);
    }
    for (let i = 1; i < matches.length; i += 1) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    }
  });

  it("returns nearby published locations sorted by distance", () => {
    const nearby = nearbyLocations(first, 4);
    expect(nearby.length).toBeLessThanOrEqual(4);
    for (let i = 1; i < nearby.length; i += 1) {
      expect(nearby[i - 1].distanceKm).toBeLessThanOrEqual(nearby[i].distanceKm);
    }
  });

  it("reports stats consistent with the dataset", () => {
    const stats = locationStats();
    expect(stats.published).toBe(datasetMeta.published);
    expect(stats.draft).toBe(datasetMeta.draft);
    expect(stats.verifiedPhotos).toBe(datasetMeta.verified_photos);
    expect(stats.provincesCovered).toBeGreaterThan(0);
  });
});

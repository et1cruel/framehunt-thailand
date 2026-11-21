import type { SupabaseClient } from "@supabase/supabase-js";
import type { LocationRecord } from "@/data/types";
import { createLocationCatalog } from "@/services/locations";

type CatalogRow = Omit<
  LocationRecord,
  "photos" | "photo_count" | "sources" | "categories" | "moods" | "creative" | "filming"
> & {
  location_photos: LocationRecord["photos"];
  location_sources: LocationRecord["sources"];
  location_categories: { category_slug: string }[];
  location_moods: { mood_slug: string; relevance_score: number }[];
  creative: Partial<LocationRecord["creative"]>;
  filming: Partial<LocationRecord["filming"]>;
};

export async function loadRemoteCatalog(client: SupabaseClient, signal: AbortSignal, publishedOnly = true) {
  const records: LocationRecord[] = [];
  const batchSize = 50;

  for (let offset = 0; ; offset += batchSize) {
    const query = client
      .from("locations")
      .select(
        "*, location_photos(*), location_sources(*), location_categories(category_slug), location_moods(mood_slug,relevance_score)",
      )
      .order("id")
      .order("is_cover", { referencedTable: "location_photos", ascending: false })
      .order("id", { referencedTable: "location_photos" })
      .range(offset, offset + batchSize - 1)
      .abortSignal(signal);

    if (publishedOnly) {
      query.eq("status", "published").eq("location_photos.is_verified", true);
    }

    const { data, error } = await query.overrideTypes<CatalogRow[], { merge: false }>();
    if (error) throw error;
    for (const row of data) {
      const { location_photos, location_sources, location_categories, location_moods, ...location } = row;
      records.push({
        ...location,
        photos: location_photos,
        photo_count: location_photos.length,
        sources: location_sources,
        categories: location_categories.map(({ category_slug }) => category_slug),
        moods: location_moods
          .map(({ mood_slug, relevance_score }) => ({
            slug: mood_slug,
            relevance_score: relevance_score / 100,
          }))
          .sort((a, b) => b.relevance_score - a.relevance_score),
        filming: {
          mv_suitability: null,
          music_genres: [],
          recommended_angles: [],
          best_light_window: null,
          artificial_light_allowed: "unknown",
          large_equipment_allowed: "unknown",
          drone_allowed: "unknown",
          drone_note: "ต้องตรวจสอบก่อนถ่ายทำ",
          sound_restrictions: "unknown",
          dressing_room: "unknown",
          parking: "unknown",
          crew_size: "unknown",
          ...location.filming,
        },
        creative: {
          suggested_moods: [],
          shot_types: [],
          palette: [],
          light_window_note: "ยังไม่มีข้อมูลยืนยัน",
          ...location.creative,
        },
      });
    }
    if (data.length < batchSize) break;
  }

  const latestUpdate = records.reduce<string | null>(
    (latest, record) => (latest && latest > record.updated_at ? latest : record.updated_at),
    null,
  );
  return createLocationCatalog(records, latestUpdate);
}

import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { emptyFilters } from "@/data/types";
import { loadRemoteCatalog } from "@/services/catalogRemote";
import { publishedLocations } from "@/services/locations";

const [published] = publishedLocations();

describe("Supabase catalog", () => {
  it("reads public rows and supplies the same catalog to search and detail", async () => {
    const { photos, sources, moods, categories, ...location } = published;
    const row = {
      ...location,
      name_th: "ชื่อจากฐานทดสอบ",
      location_photos: photos,
      location_sources: sources,
      location_categories: categories.map((category_slug) => ({ category_slug })),
      location_moods: [{ mood_slug: moods[0].slug, relevance_score: 90 }],
      creative: {},
    };
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/rest/v1/locations");
      expect(url.searchParams.get("status")).toBe("eq.published");
      expect(url.searchParams.get("location_photos.is_verified")).toBe("eq.true");
      expect(url.searchParams.get("limit")).toBe("50");
      return Response.json([row]);
    });
    const client = createClient("https://framehunt.example.test", "test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch },
    });

    const catalog = await loadRemoteCatalog(client, new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(catalog.locationStats().published).toBe(1);
    expect(catalog.getLocation(location.slug)?.creative.shot_types).toEqual([]);
    const results = catalog.searchLocations({ ...emptyFilters, q: row.name_th });
    expect(results.map(({ location }) => location.name_th)).toEqual([row.name_th]);
    expect(results[0].location.moods[0].relevance_score).toBe(0.9);
  });
});

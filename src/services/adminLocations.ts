import datasetJson from "@/data/locations.generated.json";
import type { Dataset } from "@/data/types";
import { createLocationCatalog } from "@/services/locations";

const dataset = datasetJson as unknown as Dataset;
export const adminCatalog = createLocationCatalog(dataset.locations, dataset.meta.generated_at);

export const {
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
} = adminCatalog;

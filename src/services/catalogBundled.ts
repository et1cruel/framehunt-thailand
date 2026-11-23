import type { LocationRecord } from "@/data/types";
import { bundledCatalogAssetUrl, createLocationCatalog, datasetMeta } from "@/services/locations";

export async function loadBundledCatalog(signal: AbortSignal) {
  const response = await fetch(bundledCatalogAssetUrl, { signal });
  if (!response.ok) {
    throw new Error(`Bundled location data request failed (${response.status}).`);
  }

  const records = (await response.json()) as LocationRecord[];
  if (
    !Array.isArray(records) ||
    records.length !== datasetMeta.published ||
    records.some((record) => record.status !== "published")
  ) {
    throw new Error("Bundled location data does not match the published catalogue snapshot.");
  }

  const catalog = createLocationCatalog(records, datasetMeta.generated_at, {
    total: datasetMeta.total_locations,
    draft: datasetMeta.draft,
  });
  if (catalog.publishedLocations().length !== records.length) {
    throw new Error("Bundled location data contains records that fail the public publication gate.");
  }
  return catalog;
}

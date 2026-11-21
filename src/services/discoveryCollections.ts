import directory from "@/data/activity-directory.json";
import type { LocationRecord } from "@/data/types";

export type CollectionKind = "cave" | "art" | "temple" | "nakhon-pathom";
export type DiscoveryPlace = { name: string; province: string; district?: string; sourceUrl?: string; lat?: number; lon?: number };
const normalize = (value: string) => value.toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");

export function collectionItems(kind: CollectionKind, published: LocationRecord[]) {
  const slugs = kind === "cave" ? ["cave", "limestone"] : kind === "temple" ? ["temple", "ancient-temple", "pagoda"] : ["art-gallery", "contemporary-art", "exhibition-space"];
  const locations = published.filter((location) => kind === "nakhon-pathom" ? location.province_th === "นครปฐม" : slugs.some((slug) => location.categories.includes(slug)));
  const known = new Set(published.flatMap((location) => [location.name_th, location.name_en].filter(Boolean).map((name) => `${normalize(name)}|${normalize(location.province_th)}`)));
  const leads = directory.places.filter((place) => kind === "cave" ? place.name.includes("ถ้ำ") && place.categories.includes("nature") : place.categories.includes(kind))
    .filter((place) => !known.has(`${normalize(place.name.split(" · ")[0])}|${normalize(place.province)}`)) as DiscoveryPlace[];
  return { locations, leads, count: locations.length + leads.length };
}

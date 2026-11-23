import activityDirectory from "@/data/activity-directory.json";
import foodDirectory from "@/data/food-directory.json";
import provincesData from "@/data/provinces.json";
import secondhandDirectory from "@/data/secondhand-shops.json";
import studiosDirectory from "@/data/studios-directory.json";
import { sceneVenues } from "@/data/live-programs";
import type { LocationRecord } from "@/data/types";

type DirectoryPlace = { name: string; province: string };

const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");

const provinceAliases = new Map<string, string>();
for (const province of provincesData.provinces) {
  const canonical = normalize(province.name_th);
  for (const alias of [province.name_th, province.name_en, province.slug]) {
    provinceAliases.set(normalize(alias), canonical);
  }
}

function placeKey(name: string, province: string) {
  const provinceKey = normalize(province);
  return `${normalize(name)}|${provinceAliases.get(provinceKey) ?? provinceKey}`;
}

/** Count unique place listings across every browsable location directory. */
export function countCatalogPlaces(published: LocationRecord[]) {
  const known = new Set<string>();

  for (const location of published) {
    known.add(placeKey(location.name_th, location.province_th));
    known.add(placeKey(location.name_en, location.province_th));
  }

  let total = published.length;
  const directories: { places: DirectoryPlace[]; matchActivityAlias?: boolean }[] = [
    { places: activityDirectory.places, matchActivityAlias: true },
    { places: foodDirectory.restaurants },
    { places: secondhandDirectory.shops },
    { places: studiosDirectory.studios },
    { places: sceneVenues },
  ];

  for (const directory of directories) {
    for (const place of directory.places) {
      const key = placeKey(place.name, place.province);
      const activityAlias = directory.matchActivityAlias && place.name.includes(" · ")
        ? placeKey(place.name.split(" · ")[0], place.province)
        : null;
      if (known.has(key) || (activityAlias && known.has(activityAlias))) continue;
      known.add(key);
      total += 1;
    }
  }

  return total;
}

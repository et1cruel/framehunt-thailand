import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (name) => readFileSync(new URL(`../src/data/${name}`, import.meta.url), "utf8");
const json = (name) => JSON.parse(read(`${name}.json`));
const covers = json("directory-covers");
const studios = json("studios-directory").studios;
const activityPlaces = json("activity-directory").places;
const { sceneVenues, programs } = await import(
  "data:text/javascript;charset=utf-8," +
    encodeURIComponent(ts.transpileModule(read("live-programs.ts"), {
      compilerOptions: { module: ts.ModuleKind.ESNext },
    }).outputText)
);
const activities = [
  ...activityPlaces,
  ...sceneVenues.map((venue) => ({ ...venue, province: "กรุงเทพมหานคร" })),
  ...studios,
];
const published = json("locations.generated").locations.filter(({ status }) => status === "published");
const report = {};
const missing = {};

function check(section, entries, getCover) {
  const uncovered = entries.flatMap((entry) => {
    const url = getCover(entry);
    if (url && !url.startsWith("https://images.unsplash.com/")) return [];
    return [{
      name: entry.name ?? entry.name_th ?? entry.title,
      province: entry.province_th ?? entry.province,
      reason: url ? "stock photo" : "missing photo",
    }];
  });
  report[section] = { total: entries.length, withPhoto: entries.length - uncovered.length, remaining: uncovered.length };
  missing[section] = uncovered;
}

const matchCover = (entry, source) =>
  (covers[`${entry.name}|${entry.province}`] ?? (source && covers[source]))?.url;

check("Locations", published, (loc) => (loc.photos.find((photo) => photo.is_cover) ?? loc.photos[0])?.image_url);
check("Secondhand", json("secondhand-shops").shops, (entry) => matchCover(entry));
check("Food", json("food-directory").restaurants, (entry) => matchCover(entry, entry.source));
check("Activities", activities, (entry) => matchCover(entry));
check("Studios", studios, (entry) => matchCover(entry, entry.sourceUrl));
check("Live posters", programs, (entry) => entry.poster);

const normalize = (name) => name.toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]/gu, "");
const locationNames = new Set(published.flatMap((loc) =>
  [loc.name_th, loc.name_en].filter(Boolean).map((name) => `${normalize(name)}|${normalize(loc.province_th)}`),
));
for (const category of ["cave", "art", "temple", "nakhon-pathom"]) {
  const leads = activityPlaces.filter((place) => (
    category === "cave"
      ? place.name.includes("ถ้ำ") && place.categories.includes("nature")
      : place.categories.includes(category)
  ) && !locationNames.has(`${normalize(place.name.split(" · ")[0])}|${normalize(place.province)}`));
  check(`Collection leads: ${category}`, leads, (entry) => matchCover(entry));
}

if (process.argv.includes("--json")) console.log(JSON.stringify({ report, missing }, null, 2));
else console.table(report);
if (process.argv.includes("--strict") && Object.values(report).some(({ remaining }) => remaining > 0)) process.exitCode = 1;

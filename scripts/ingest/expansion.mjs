import { readFile } from "node:fs/promises";

const profiles = {
  night: ["cityscape", ["unique-architecture"], { cinematic: 0.8 }],
  music: ["music venue", ["live-music"], { experimental: 0.8, cinematic: 0.65 }],
  park: ["park", ["forest", "grassland"], { ambient: 0.9, cinematic: 0.7 }],
  forest: ["national park", ["forest", "nature"], { ambient: 0.9, cinematic: 0.8 }],
  bridge: ["bridge", ["unique-architecture", "concrete"], { cinematic: 0.8, minimal: 0.6 }],
  urban: ["neighbourhood", ["old-building", "vintage-architecture"], { nostalgic: 0.85, cinematic: 0.7 }],
  market: ["market", ["creative-community", "vintage-architecture"], { nostalgic: 0.85, cinematic: 0.7 }],
  rail: ["railway station", ["vintage-architecture", "old-building"], { nostalgic: 0.9, cinematic: 0.7 }],
  industrial: ["industrial site", ["industrial", "unique-architecture"], { dystopian: 0.8, cinematic: 0.75 }],
  tower: ["architecture", ["unique-architecture", "concrete"], { futuristic: 0.8, cinematic: 0.7 }],
  museum: ["museum", ["museum", "unique-architecture"], { experimental: 0.75, cinematic: 0.65 }],
  art: ["art centre", ["art-gallery", "contemporary-art"], { experimental: 0.9, minimal: 0.7 }],
  palace: ["palace", ["castle-like", "unique-architecture"], { cinematic: 0.85, nostalgic: 0.7 }],
  temple: ["temple", ["temple", "religious-architecture"], { ethereal: 0.8, cinematic: 0.75 }],
  "hidden-temple": ["temple", ["temple", "religious-architecture", "hidden-frames"], { ethereal: 0.8, cinematic: 0.85 }],
  worship: ["place of worship", ["religious-architecture"], { ethereal: 0.8, cinematic: 0.75 }],
  ruins: ["historical park", ["historical-park", "ruins"], { cinematic: 0.9, nostalgic: 0.75 }],
  mountain: ["mountain", ["mountain", "forest"], { ambient: 0.85, cinematic: 0.85 }],
  "hidden-mountain": ["mountain", ["mountain", "forest", "hidden-frames"], { ambient: 0.85, cinematic: 0.9 }],
  "hidden-canyon": ["canyon", ["canyon", "rock-formation", "hidden-frames"], { surreal: 0.85, cinematic: 0.9 }],
  cave: ["cave", ["cave", "rock-formation"], { dark: 0.85, surreal: 0.8 }],
  "hidden-cave": ["cave", ["cave", "rock-formation", "hidden-frames"], { dark: 0.85, surreal: 0.85 }],
  waterfall: ["waterfall", ["waterfall", "forest"], { ambient: 0.9, ethereal: 0.7 }],
  "hidden-waterfall": ["waterfall", ["waterfall", "forest", "hidden-frames"], { ambient: 0.9, ethereal: 0.8 }],
  water: ["lake", ["lake"], { ambient: 0.9, lonely: 0.7 }],
  lake: ["lake", ["lake", "water"], { ambient: 0.9, cinematic: 0.7 }],
  island: ["island", ["beach", "rock-formation"], { ambient: 0.85, cinematic: 0.85 }],
  "hidden-island": ["island", ["beach", "rock-formation", "hidden-frames"], { ambient: 0.85, cinematic: 0.9 }],
  beach: ["beach", ["beach"], { ambient: 0.8, cinematic: 0.8 }],
  "hidden-beach": ["beach", ["beach", "hidden-frames"], { ambient: 0.85, cinematic: 0.85 }],
  canyon: ["canyon", ["canyon", "rock-formation"], { surreal: 0.85, cinematic: 0.85 }],
};

const original = await readFile(new URL("./expansion.tsv", import.meta.url), "utf8");
const nightMusic = await readFile(new URL("./night-music.tsv", import.meta.url), "utf8");

function parseSeeds(rows, wave) {
  return rows
    .trim()
    .split(/\r?\n/)
    .map((row) => {
      const [province, profile, name_en, name_th, qid, commonsCategory] = row.split("\t");
      if (!name_th || !profiles[profile] || (qid && !/^Q[1-9]\d*$/.test(qid)))
        throw new Error(`Invalid expansion lead: ${row}`);
      const [location_type, categories, moods] = profiles[profile];
      return {
        province,
        name_en,
        name_th,
        location_type,
        categories,
        moods,
        architectural_style: "unknown",
        strict: true,
        wave,
        night: profile === "night",
        qid,
        commonsCategory,
      };
    });
}

const lowKey = await readFile(new URL("./low-key.tsv", import.meta.url), "utf8");
const bangkokFrames = await readFile(new URL("./bangkok-frames.tsv", import.meta.url), "utf8");
const wildPlaces = await readFile(new URL("./wild-places.tsv", import.meta.url), "utf8");
const hiddenThailand = await readFile(new URL("./hidden-thailand.tsv", import.meta.url), "utf8");
const moreWildPlaces = await readFile(new URL("./more-wild-places.tsv", import.meta.url), "utf8");
const moreWildPlaces2 = await readFile(new URL("./more-wild-places-2.tsv", import.meta.url), "utf8").catch(() => "");
const moreWildPlaces3 = await readFile(new URL("./more-wild-places-3.tsv", import.meta.url), "utf8");
const moreWildPlaces4 = await readFile(new URL("./more-wild-places-4.tsv", import.meta.url), "utf8");
const moreWildPlaces5 = await readFile(new URL("./more-wild-places-5.tsv", import.meta.url), "utf8");
export const expansionSeeds = [
  ...parseSeeds(original, null),
  ...parseSeeds(nightMusic, "night-music"),
  ...parseSeeds(lowKey, "low-key"),
  ...parseSeeds(bangkokFrames, "bangkok-frames"),
  ...parseSeeds(wildPlaces, "wild-places"),
  ...parseSeeds(hiddenThailand, "hidden-thailand"),
  ...parseSeeds(moreWildPlaces, "more-wild-places"),
  ...(moreWildPlaces2.trim() ? parseSeeds(moreWildPlaces2, "more-wild-places-2") : []),
  ...parseSeeds(moreWildPlaces3, "more-wild-places-3"),
  ...parseSeeds(moreWildPlaces4, "more-wild-places-4"),
  ...parseSeeds(moreWildPlaces5, "more-wild-places-5"),
];
 

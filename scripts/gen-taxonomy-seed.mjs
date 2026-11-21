// Generates supabase/migrations/0002_taxonomy.sql from the app's JSON taxonomy.
// Usage: node scripts/gen-taxonomy-seed.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const provinceFile = JSON.parse(fs.readFileSync(path.join(root, "src/data/provinces.json"), "utf8"));
const provinces = provinceFile.provinces ?? provinceFile;
const taxonomy = JSON.parse(fs.readFileSync(path.join(root, "src/data/taxonomy.json"), "utf8"));

const q = (value) => `'${String(value).replace(/'/g, "''")}'`;

const lines = [
  "-- Generated from src/data/provinces.json and src/data/taxonomy.json.",
  "-- Regenerate with: node scripts/gen-taxonomy-seed.mjs",
  "",
  "insert into public.provinces (slug, name_th, name_en, region, zone) values",
  provinces.map((p) => `  (${q(p.slug)}, ${q(p.name_th)}, ${q(p.name_en)}, ${q(p.region)}, ${q(p.zone)})`).join(",\n") +
    "\non conflict (slug) do update set name_th = excluded.name_th, name_en = excluded.name_en, region = excluded.region, zone = excluded.zone;",
  "",
  'insert into public.categories (slug, name_th, name_en, "group", icon) values',
  taxonomy.categories
    .map((c) => `  (${q(c.slug)}, ${q(c.name_th)}, ${q(c.name_en)}, ${q(c.group)}, ${q(c.icon)})`)
    .join(",\n") +
    '\non conflict (slug) do update set name_th = excluded.name_th, name_en = excluded.name_en, "group" = excluded."group", icon = excluded.icon;',
  "",
  "insert into public.moods (slug, name_th, name_en) values",
  taxonomy.moods.map((m) => `  (${q(m.slug)}, ${q(m.name_th)}, ${q(m.name_en)})`).join(",\n") +
    "\non conflict (slug) do update set name_th = excluded.name_th, name_en = excluded.name_en;",
  "",
];

const out = path.join(root, "supabase/migrations/0002_taxonomy.sql");
fs.writeFileSync(out, lines.join("\n"));
console.log(
  `Wrote ${out}: ${provinces.length} provinces, ${taxonomy.categories.length} categories, ${taxonomy.moods.length} moods`,
);

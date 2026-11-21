import taxonomyJson from "./taxonomy.json";
import provincesJson from "./provinces.json";
import type { Province, TaxonomyCategory, TaxonomyMood } from "./types";

export const categories = taxonomyJson.categories as TaxonomyCategory[];
export const moods = taxonomyJson.moods as TaxonomyMood[];
export const provinces = provincesJson.provinces as Province[];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
export const moodBySlug = new Map(moods.map((m) => [m.slug, m]));
export const provinceBySlug = new Map(provinces.map((p) => [p.slug, p]));

export const GROUP_META: Record<
  TaxonomyCategory["group"],
  { name_th: string; name_en: string; color: string; marker: string }
> = {
  urban: { name_th: "เมืองและใต้ดิน", name_en: "Urban / Underground", color: "#a2503e", marker: "#b56853" },
  art: { name_th: "ศิลปะและสร้างสรรค์", name_en: "Art & Creative", color: "#674e9a", marker: "#8267b6" },
  nature: { name_th: "ธรรมชาติและภาพยนตร์", name_en: "Nature & Cinematic", color: "#386f52", marker: "#4f956b" },
  historical: { name_th: "ประวัติศาสตร์และศาสนา", name_en: "Historical & Spiritual", color: "#825b20", marker: "#aa7829" },
};

export const REGION_LABELS: Record<string, { th: string; en: string }> = {
  Bangkok: { th: "กรุงเทพมหานคร", en: "Bangkok" },
  Central: { th: "ภาคกลาง", en: "Central Thailand" },
  North: { th: "ภาคเหนือ", en: "Northern Thailand" },
  Northeast: { th: "ภาคอีสาน", en: "Northeastern Thailand" },
  East: { th: "ภาคตะวันออก", en: "Eastern Thailand" },
  West: { th: "ภาคตะวันตก", en: "Western Thailand" },
  South: { th: "ภาคใต้", en: "Southern Thailand" },
};

/** The homepage quick categories map to one or more taxonomy slugs. */
export const QUICK_CATEGORIES = [
  { key: "hidden", label: "HIDDEN FRAMES", th: "มุมที่คนมองข้าม", slugs: ["hidden-frames"] },
  { key: "abandoned", label: "ABANDONED", th: "สถานที่ร้าง", slugs: ["abandoned", "urban-decay", "ruins"] },
  { key: "industrial", label: "INDUSTRIAL", th: "อุตสาหกรรม", slugs: ["industrial", "warehouse", "concrete"] },
  { key: "art", label: "ART SPACES", th: "พื้นที่ศิลปะ", slugs: ["art-gallery", "contemporary-art", "exhibition-space"] },
  { key: "temple", label: "TEMPLES", th: "วัด", slugs: ["temple", "ancient-temple", "pagoda"] },
  { key: "cave", label: "CAVES", th: "ถ้ำ", slugs: ["cave", "limestone"] },
  { key: "nature", label: "NATURE", th: "ธรรมชาติ", slugs: ["mountain", "waterfall", "forest", "beach"] },
  { key: "night", label: "NIGHT CITY", th: "เมืองกลางคืน", slugs: ["neon-night", "cyberpunk"] },
  {
    key: "surreal",
    label: "SURREAL",
    th: "เหนือจริง",
    slugs: ["unique-architecture", "rock-formation", "installation-art"],
  },
] as const;

export function categoryName(slug: string, lang: "th" | "en" = "th") {
  const c = categoryBySlug.get(slug);
  return c ? (lang === "th" ? c.name_th : c.name_en) : slug;
}

export function moodName(slug: string, lang: "th" | "en" = "th") {
  const m = moodBySlug.get(slug);
  return m ? (lang === "th" ? m.name_th : m.name_en) : slug;
}

export function groupOf(slugs: string[]): TaxonomyCategory["group"] {
  for (const group of ["historical", "nature", "art", "urban"] as const) {
    if (slugs.some((s) => categoryBySlug.get(s)?.group === group)) return group;
  }
  return "urban";
}

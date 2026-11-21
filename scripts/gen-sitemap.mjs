// Generates public/sitemap.xml and public/robots.txt from the published dataset.
// Usage: node scripts/gen-sitemap.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "src/data/locations.generated.json"), "utf8"));
const SITE = process.env.SITE_URL ?? "https://framehunt.co";

const published = dataset.locations.filter((loc) => loc.status === "published");
const staticRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/explore", priority: "0.9", changefreq: "weekly" },
  { path: "/live-music", priority: "0.8", changefreq: "weekly" },
  { path: "/secondhand", priority: "0.8", changefreq: "monthly" },
  { path: "/food", priority: "0.9", changefreq: "weekly" },
  { path: "/activities", priority: "0.8", changefreq: "monthly" },
  { path: "/map", priority: "0.8", changefreq: "monthly" },
  { path: "/find-my-vibe", priority: "0.8", changefreq: "monthly" },
  { path: "/boards", priority: "0.5", changefreq: "monthly" },
  { path: "/submit", priority: "0.5", changefreq: "yearly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
];

const escapeXml = (value) =>
  String(value).replace(
    /[<>&'"]/g,
    (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch],
  );

const urls = [
  ...staticRoutes.map(
    (route) =>
      `  <url>\n    <loc>${SITE}${route.path}</loc>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>`,
  ),
  ...published.map((loc) => {
    const lastmod = String(loc.updated_at ?? loc.verified_at ?? "").slice(0, 10);
    return `  <url>\n    <loc>${SITE}/locations/${escapeXml(loc.slug)}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""
    }\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
  }),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
fs.writeFileSync(path.join(root, "public/sitemap.xml"), sitemap);

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /admin",
  "Disallow: /api/",
  "",
  `Sitemap: ${SITE}/sitemap.xml`,
  "",
].join("\n");
fs.writeFileSync(path.join(root, "public/robots.txt"), robots);

console.log(`Sitemap: ${published.length} published locations + ${staticRoutes.length} static routes`);

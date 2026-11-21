// Rasterises the OG card and the touch icon from the SVG sources.
// Usage: node scripts/render-assets.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

const og = await sharp(path.join(publicDir, "og-default.svg"), { density: 144 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toBuffer();
fs.writeFileSync(path.join(publicDir, "og-default.png"), og);

const touch = await sharp(path.join(publicDir, "favicon.svg"), { density: 384 }).resize(180, 180).png().toBuffer();
fs.writeFileSync(path.join(publicDir, "apple-touch-icon.png"), touch);

const icon32 = await sharp(path.join(publicDir, "favicon.svg"), { density: 384 }).resize(32, 32).png().toBuffer();
fs.writeFileSync(path.join(publicDir, "favicon-32.png"), icon32);

console.log("Wrote og-default.png, apple-touch-icon.png, favicon-32.png");

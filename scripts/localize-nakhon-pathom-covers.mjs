import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const coversPath = path.join(process.cwd(), "src/data/directory-covers.json");
const activityPath = path.join(process.cwd(), "src/data/activity-directory.json");
const assetDir = path.join(process.cwd(), "public/covers/nakhon-pathom");
const covers = JSON.parse(await fs.readFile(coversPath, "utf8"));
const places = JSON.parse(await fs.readFile(activityPath, "utf8")).places.filter((place) => place.province === "นครปฐม");
const remote = places.map((place) => ({ place, key: `${place.name}|${place.province}`, cover: covers[`${place.name}|${place.province}`] }))
  .filter(({ cover }) => cover?.url && !cover.url.startsWith("/covers/nakhon-pathom/"));

await fs.mkdir(assetDir, { recursive: true });
for (let offset = 0; offset < remote.length; offset += 3) {
  await Promise.all(remote.slice(offset, offset + 3).map(async ({ place, key, cover }) => {
    const response = await fetch(cover.url, {
      signal: AbortSignal.timeout(30000),
      headers: { "user-agent": "FramehuntThailand/1.0 location directory" },
    });
    if (!response.ok) throw new Error(`${place.name}: image HTTP ${response.status}`);
    const input = Buffer.from(await response.arrayBuffer());
    if (!response.headers.get("content-type")?.startsWith("image/")) throw new Error(`${place.name}: URL did not return an image`);
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height || metadata.width < 220 || metadata.height < 140) {
      throw new Error(`${place.name}: image too small (${metadata.width}x${metadata.height})`);
    }
    const filename = `${crypto.createHash("sha256").update(key).digest("hex").slice(0, 16)}.webp`;
    const output = await sharp(input)
      .rotate()
      .resize({ width: 1200, height: 800, fit: "cover", position: "attention" })
      .webp({ quality: 84 })
      .toBuffer();
    await fs.writeFile(path.join(assetDir, filename), output);
    covers[key] = { ...cover, url: `/covers/nakhon-pathom/${filename}` };
    console.log(`Cached ${place.name} (${metadata.width}x${metadata.height})`);
  }));
}

await fs.writeFile(coversPath, `${JSON.stringify(covers, null, 2)}\n`);
console.log(`Cached ${remote.length} previously remote Nakhon Pathom covers.`);

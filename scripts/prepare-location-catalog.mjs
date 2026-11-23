import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "src/data/locations.generated.json");
const metadataDirectory = path.join(root, "src/data/generated");
const publicDirectory = path.join(root, "public/data");
const source = JSON.parse(await fs.readFile(inputPath, "utf8"));

if (!Array.isArray(source.locations) || !source.meta || !Number.isFinite(source.meta.published)) {
  throw new Error("The generated location dataset has an unexpected shape.");
}

const published = source.locations.filter((location) => location.status === "published");
if (published.length !== source.meta.published) {
  throw new Error(`Published records mismatch: metadata says ${source.meta.published}, found ${published.length}.`);
}

const publishedJson = JSON.stringify(published);
const digest = createHash("sha256").update(publishedJson).digest("hex").slice(0, 16);
const assetName = `locations.published.${digest}.json`;
const publicAssetUrl = `/data/${assetName}`;
await Promise.all([
  fs.mkdir(metadataDirectory, { recursive: true }),
  fs.mkdir(publicDirectory, { recursive: true }),
]);

for (const name of await fs.readdir(publicDirectory)) {
  if (name === "locations.published.json" || /^locations\.published\.[a-f0-9]{12,16}\.json$/.test(name)) {
    await fs.rm(path.join(publicDirectory, name), { force: true });
  }
}
await fs.rm(path.join(metadataDirectory, "locations.meta.json"), { force: true });

await Promise.all([
  fs.writeFile(path.join(publicDirectory, assetName), publishedJson),
  fs.writeFile(path.join(metadataDirectory, "catalogManifest.json"), JSON.stringify({
    meta: source.meta,
    publishedAssetUrl: publicAssetUrl,
  })),
]);

console.log(`Prepared ${published.length} public records at ${publicAssetUrl}; review data remains in the lazy admin bundle.`);

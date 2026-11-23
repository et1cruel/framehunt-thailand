import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.join(root, "src/data/locations.generated.json");
const metadataDirectory = path.join(root, "src/data/generated");
const publicDirectory = path.join(root, "public/data");
const galleryDirectory = path.join(publicDirectory, "galleries");
const source = JSON.parse(await fs.readFile(inputPath, "utf8"));

if (!Array.isArray(source.locations) || !source.meta || !Number.isFinite(source.meta.published)) {
  throw new Error("The generated location dataset has an unexpected shape.");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function validatePublishedLocation(location) {
  if (
    location.status !== "published" ||
    location.latitude < 5 || location.latitude > 21 ||
    location.longitude < 97 || location.longitude > 106 ||
    !location.sources?.some((item) => item.source_url?.startsWith("https://")) ||
    !Array.isArray(location.photos) ||
    location.photos.length < (location.curated_photo_minimum ?? source.meta.min_photos_required ?? 5) ||
    location.photo_count !== location.photos.length ||
    !/^[a-z0-9-]+$/.test(location.slug)
  ) {
    throw new Error(`Published location failed the full publication gate: ${location.slug ?? "(missing slug)"}`);
  }

  const checksums = new Set();
  const originalUrls = new Set();
  const perceptualHashes = new Set();
  for (const photo of location.photos) {
    if (
      !photo.is_verified || !photo.checksum?.trim() || !photo.photographer?.trim() ||
      !photo.license?.trim() || !photo.attribution_text?.trim() ||
      !photo.image_url?.startsWith("https://") || !photo.source_page_url?.startsWith("https://") ||
      checksums.has(photo.checksum) || originalUrls.has(photo.original_url) ||
      (photo.perceptual_hash && perceptualHashes.has(photo.perceptual_hash))
    ) {
      throw new Error(`Published photo failed verification: ${location.slug}/${photo.id}`);
    }
    checksums.add(photo.checksum);
    originalUrls.add(photo.original_url);
    if (photo.perceptual_hash) perceptualHashes.add(photo.perceptual_hash);
  }
}

const published = source.locations.filter((location) => location.status === "published");
if (published.length !== source.meta.published) {
  throw new Error(`Published records mismatch: metadata says ${source.meta.published}, found ${published.length}.`);
}
for (const location of published) validatePublishedLocation(location);

const photoTotal = published.reduce((total, location) => total + location.photos.length, 0);
if (photoTotal !== source.meta.verified_photos) {
  throw new Error(`Published photo mismatch: metadata says ${source.meta.verified_photos}, found ${photoTotal}.`);
}

await Promise.all([
  fs.mkdir(metadataDirectory, { recursive: true }),
  fs.mkdir(publicDirectory, { recursive: true }),
  fs.mkdir(galleryDirectory, { recursive: true }),
]);

// Remove only content-hashed catalogue/gallery artifacts produced here.
for (const name of await fs.readdir(publicDirectory)) {
  if (name === "locations.published.json" || /^locations\.published\.[a-f0-9]{12,16}\.json$/.test(name)) {
    await fs.rm(path.join(publicDirectory, name), { force: true });
  }
}
for (const name of await fs.readdir(galleryDirectory)) {
  if (/^[a-z0-9-]+\.[a-f0-9]{12,16}\.json$/.test(name)) {
    await fs.rm(path.join(galleryDirectory, name), { force: true });
  }
}
await fs.rm(path.join(metadataDirectory, "locations.meta.json"), { force: true });

const slimRecords = [];
for (const location of published) {
  const galleryJson = JSON.stringify(location.photos);
  const galleryName = `${location.slug}.${digest(galleryJson)}.json`;
  await fs.writeFile(path.join(galleryDirectory, galleryName), galleryJson);

  const cover = location.photos.find((photo) => photo.is_cover) ?? location.photos[0];
  slimRecords.push({
    ...location,
    photos: [cover],
    gallery_asset_url: `/data/galleries/${galleryName}`,
  });
}

const publishedJson = JSON.stringify(slimRecords);
const assetName = `locations.published.${digest(publishedJson)}.json`;
const publicAssetUrl = `/data/${assetName}`;
await Promise.all([
  fs.writeFile(path.join(publicDirectory, assetName), publishedJson),
  fs.writeFile(path.join(metadataDirectory, "catalogManifest.json"), JSON.stringify({
    meta: source.meta,
    publishedAssetUrl: publicAssetUrl,
  })),
]);

console.log(`Prepared ${slimRecords.length} public records (${photoTotal} photos) at ${publicAssetUrl}; individual photo galleries load on demand.`);

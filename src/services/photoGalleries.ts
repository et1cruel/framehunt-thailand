import type { LocationPhoto } from "@/data/types";

const galleryCache = new Map<string, LocationPhoto[]>();
const pendingGalleries = new Map<string, Promise<LocationPhoto[]>>();
const MAX_GALLERIES_IN_MEMORY = 48;

function rememberGallery(url: string, photos: LocationPhoto[]) {
  galleryCache.delete(url);
  galleryCache.set(url, photos);
  while (galleryCache.size > MAX_GALLERIES_IN_MEMORY) {
    const oldest = galleryCache.keys().next().value;
    if (!oldest) break;
    galleryCache.delete(oldest);
  }
}

/** Fetch one verified, content-hashed gallery for its own location. */
export function loadPhotoGallery(url: string | undefined, expectedCount: number): Promise<LocationPhoto[]> {
  if (!url || !/^\/data\/galleries\/[a-z0-9-]+\.[a-f0-9]{12,16}\.json$/.test(url)) {
    return Promise.reject(new Error("This location does not have a valid photo archive URL."));
  }

  const cached = galleryCache.get(url);
  if (cached) {
    rememberGallery(url, cached);
    return Promise.resolve(cached);
  }

  const pending = pendingGalleries.get(url);
  if (pending) return pending;

  const request = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`Photo archive request failed (${response.status}).`);
    const photos = (await response.json()) as LocationPhoto[];
    if (
      !Array.isArray(photos) || photos.length !== expectedCount ||
      photos.some((photo) => !photo?.is_verified || !photo.image_url?.startsWith("https://") || !photo.source_page_url?.startsWith("https://"))
    ) {
      throw new Error("The photo archive does not match its verified location record.");
    }
    rememberGallery(url, photos);
    return photos;
  }).finally(() => pendingGalleries.delete(url));

  pendingGalleries.set(url, request);
  return request;
}

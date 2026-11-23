import { useQuery } from "@tanstack/react-query";

export type DirectoryCover = {
  url: string;
  source: string;
  credit: string;
  license?: string;
};

export type DirectoryCoverIndex = Record<string, DirectoryCover>;

const directoryCoverAsset = new URL("../data/directory-covers.json", import.meta.url).href;

export function useDirectoryCovers() {
  return useQuery({
    queryKey: ["directory-covers", directoryCoverAsset],
    queryFn: async ({ signal }) => {
      const response = await fetch(directoryCoverAsset, { signal });
      if (!response.ok) throw new Error(`Directory cover data request failed (${response.status}).`);
      const value: unknown = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Directory cover data has an unexpected shape.");
      }
      return value as DirectoryCoverIndex;
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  });
}

export function findDirectoryCover(
  index: DirectoryCoverIndex | undefined,
  name: string,
  province: string,
  source?: string,
) {
  if (!index) return undefined;
  return index[`${name}|${province}`] ?? (source ? index[source] : undefined);
}

export function hasDirectoryCover(
  index: DirectoryCoverIndex | undefined,
  name: string,
  province: string,
  source?: string,
) {
  return Boolean(findDirectoryCover(index, name, province, source));
}

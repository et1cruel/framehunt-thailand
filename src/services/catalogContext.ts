import { createContext, useContext } from "react";
import { emptyCatalog } from "@/services/locations";

export const publicCatalogKey = ["catalog", "public"] as const;
export const CatalogContext = createContext(emptyCatalog);

export function useLocationCatalog() {
  return useContext(CatalogContext);
}

import { createContext, useContext } from "react";
import { bundledCatalog } from "@/services/locations";

export const publicCatalogKey = ["catalog", "public"] as const;
export const CatalogContext = createContext(bundledCatalog);

export function useLocationCatalog() {
  return useContext(CatalogContext);
}

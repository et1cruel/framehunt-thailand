import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { CatalogContext, publicCatalogKey } from "@/services/catalogContext";
import { loadRemoteCatalog } from "@/services/catalogRemote";
import { bundledCatalog } from "@/services/locations";

export function CatalogProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: publicCatalogKey,
    enabled: Boolean(supabase),
    queryFn: ({ signal }) => loadRemoteCatalog(supabase!, signal),
  });

  if (supabase && !query.data) {
    return (
      <main className="container-x flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        {query.isPending ? (
          <p role="status" className="text-concrete">
            กำลังโหลดโลเคชัน…
          </p>
        ) : (
          <>
            <p role="alert" className="text-concrete">
              โหลดข้อมูลโลเคชันจากฐานข้อมูลไม่สำเร็จ
            </p>
            <Button onClick={() => void query.refetch()}>ลองอีกครั้ง</Button>
          </>
        )}
      </main>
    );
  }

  return <CatalogContext.Provider value={query.data ?? bundledCatalog}>{children}</CatalogContext.Provider>;
}

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { CatalogContext, publicCatalogKey } from "@/services/catalogContext";
import { loadBundledCatalog } from "@/services/catalogBundled";
import { loadRemoteCatalog } from "@/services/catalogRemote";

export function CatalogProvider({ children }: { children: ReactNode }) {
  const query = useQuery({
    queryKey: publicCatalogKey,
    queryFn: ({ signal }) => supabase ? loadRemoteCatalog(supabase, signal) : loadBundledCatalog(signal),
  });

  if (!query.data) {
    return (
      <main className="container-x grid min-h-screen place-items-center py-8">
        {query.isPending ? (
          <div className="glass-panel max-w-md px-8 py-10 text-center" role="status" aria-live="polite">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-acid" aria-hidden />
            <p className="label-mono mt-4 text-acid">FRAMEHUNT · THAILAND</p>
            <h1 className="mt-2 font-display text-2xl font-bold">กำลังเตรียมโลเคชัน</h1>
            <p className="mt-2 text-sm leading-relaxed text-concrete">กำลังโหลดพิกัดและข้อมูลสถานที่ที่ตรวจสอบแล้ว</p>
          </div>
        ) : (
          <div className="clay-panel max-w-md px-8 py-10 text-center" role="alert">
            <Compass className="mx-auto h-7 w-7 text-burnt" aria-hidden />
            <h1 className="mt-4 font-display text-xl font-bold">โหลดข้อมูลสถานที่ไม่สำเร็จ</h1>
            <p className="mt-2 text-sm leading-relaxed text-concrete">ตรวจการเชื่อมต่อแล้วลองโหลดข้อมูลอีกครั้ง</p>
            <Button className="mt-5" onClick={() => void query.refetch()}>ลองอีกครั้ง</Button>
          </div>
        )}
      </main>
    );
  }

  return <CatalogContext.Provider value={query.data}>{children}</CatalogContext.Provider>;
}

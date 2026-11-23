import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import type { LocationRecord } from "@/data/types";

const DeferredMapCanvas = lazy(async () => {
  const module = await import("@/components/map/MapCanvas");
  return { default: module.MapCanvas };
});

const MAP_HEIGHT = "clamp(360px, 52vh, 560px)";

function MapPreviewState({ loading = false }: { loading?: boolean }) {
  return (
    <div
      className="grid w-full place-items-center overflow-hidden rounded-[1.5rem] border border-white/85 bg-gradient-to-br from-lilac/70 via-ink to-sage/60 shadow-glass"
      style={{ height: MAP_HEIGHT }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/80 bg-white/70 px-6 py-5 text-center text-concrete shadow-clay backdrop-blur-xl">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-acid" aria-hidden /> : <Compass className="h-5 w-5 text-acid" aria-hidden />}
        <span className="text-sm font-medium">
          {loading ? "กำลังเตรียมแผนที่…" : "แผนที่จะโหลดเมื่อเลื่อนมาถึงส่วนนี้"}
        </span>
      </div>
    </div>
  );
}

export function DeferredMapPreview({ locations }: { locations: LocationRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {nearViewport ? (
        <Suspense fallback={<MapPreviewState loading />}>
          <DeferredMapCanvas locations={locations} height={MAP_HEIGHT} interactive={false} />
        </Suspense>
      ) : (
        <MapPreviewState />
      )}
    </div>
  );
}

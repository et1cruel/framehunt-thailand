import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X, ZoomIn, ZoomOut, ExternalLink } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import type { LocationPhoto } from "@/data/types";
import { cn } from "@/lib/utils";

interface Props {
  photos: LocationPhoto[];
  locationName: string;
  className?: string;
}

export function PhotoGallery({ photos, locationName, className }: Props) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const touchX = useRef<number | null>(null);

  const count = photos.length;
  const current = photos[active];

  const go = useCallback(
    (delta: number) => {
      setActive((i) => (i + delta + count) % count);
      setZoom(false);
    },
    [count],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!count) return null;

  return (
    <div className={cn("", className)}>
      <div className="media-inverse relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink-2 md:aspect-[16/9]">
        <AnimatePresence mode="wait">
          <motion.img
            key={current.id}
            src={current.image_url}
            srcSet={`${current.thumb_url} 500w, ${current.image_url} 1920w`}
            sizes="(max-width: 1024px) 100vw, 70vw"
            alt={`${locationName} — ${current.title}`}
            width={current.width}
            height={current.height}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full object-cover"
          />
        </AnimatePresence>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-ink/70 to-transparent p-3 md:p-4">
          <span className="rounded-full border border-paper/25 bg-ink/90 px-2 py-1 font-mono text-xs tracking-normal text-paper/85 backdrop-blur-sm">
            {active + 1} / {count}
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 items-center gap-2 border border-paper/30 bg-ink/90 px-3 font-mono text-xs tracking-normal text-paper backdrop-blur-sm transition-colors hover:border-acid hover:text-acid"
            aria-label="เปิดภาพเต็มจอ"
          >
            <Expand className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">VIEW FULL</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="ภาพก่อนหน้า"
          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-paper/25 bg-ink/90 text-paper backdrop-blur-sm transition-colors hover:border-acid hover:text-acid"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="ภาพถัดไป"
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-paper/25 bg-ink/90 text-paper backdrop-blur-sm transition-colors hover:border-acid hover:text-acid"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent p-3 md:p-4">
          <p className="truncate font-mono text-xs tracking-normal text-concrete">
            © {current.photographer} · {current.license} ·{" "}
            <a
              href={current.source_page_url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-paper/20 underline-offset-2 hover:text-acid"
            >
              {current.source_name}
            </a>
          </p>
        </div>
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 snap-x-mandatory" role="tablist" aria-label="แกลเลอรีภาพ">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`ภาพที่ ${i + 1}: ${photo.title}`}
            onClick={() => {
              setActive(i);
              setZoom(false);
            }}
            className={cn(
              "relative h-16 w-24 shrink-0 overflow-hidden border transition-all snap-start md:h-20 md:w-28",
              i === active ? "border-acid opacity-100" : "border-transparent opacity-55 hover:opacity-90",
            )}
          >
            <img src={photo.thumb_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#202c40]/95 backdrop-blur-sm" />
          <DialogPrimitive.Content
            className="media-inverse fixed inset-0 z-[60] flex flex-col outline-none"
            aria-describedby={undefined}
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const delta = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(delta) > 50) go(delta > 0 ? -1 : 1);
              touchX.current = null;
            }}
          >
            <DialogPrimitive.Title className="sr-only">{locationName} — แกลเลอรีภาพ</DialogPrimitive.Title>

            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-acid">{String(active + 1).padStart(2, "0")}</span>
                <span className="font-mono text-xs tracking-normal text-concrete">
                  / {String(count).padStart(2, "0")}
                </span>
                <span className="hidden max-w-[40vw] truncate font-sans text-xs text-concrete sm:block">
                  {current.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoom((z) => !z)}
                  className="flex h-10 w-10 items-center justify-center border border-line text-concrete hover:border-acid hover:text-acid"
                  aria-label={zoom ? "ย่อภาพ" : "ขยายภาพ"}
                >
                  {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
                </button>
                <a
                  href={current.source_page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center border border-line text-concrete hover:border-acid hover:text-acid"
                  aria-label="เปิดหน้าต้นทางภาพ"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <DialogPrimitive.Close
                  className="flex h-10 w-10 items-center justify-center border border-line text-paper hover:border-acid hover:text-acid"
                  aria-label="ปิดแกลเลอรี"
                >
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div
              className={cn(
                "relative flex flex-1 items-center justify-center overflow-auto p-2 md:p-6",
                zoom && "items-start",
              )}
            >
              <img
                src={current.image_url}
                alt={`${locationName} — ${current.title}`}
                onClick={() => setZoom((z) => !z)}
                className={cn(
                  "max-h-full max-w-full object-contain transition-transform duration-300",
                  zoom ? "max-h-none max-w-none scale-150 cursor-zoom-out" : "cursor-zoom-in",
                )}
              />
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="ภาพก่อนหน้า"
                className="fixed left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-paper/20 bg-ink/70 text-paper hover:border-acid hover:text-acid md:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="ภาพถัดไป"
                className="fixed right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-paper/20 bg-ink/70 text-paper hover:border-acid hover:text-acid md:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            <div className="border-t border-line px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="font-sans text-xs text-concrete">
                  © {current.photographer}
                  {current.credit ? ` · ${current.credit}` : ""}
                  {" · "}
                  {current.license_url ? (
                    <a
                      href={current.license_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-acid"
                    >
                      {current.license}
                    </a>
                  ) : (
                    current.license
                  )}
                  {" · "}
                  {current.width}×{current.height}
                </p>
                <p className="font-mono text-xs tracking-normal text-concrete">
                  {current.verification_status} · {current.subject_evidence}
                </p>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => {
                      setActive(i);
                      setZoom(false);
                    }}
                    aria-label={`ไปยังภาพที่ ${i + 1}`}
                    aria-current={i === active}
                    className={cn(
                      "h-12 w-16 shrink-0 overflow-hidden border",
                      i === active ? "border-acid" : "border-transparent opacity-45 hover:opacity-80",
                    )}
                  >
                    <img src={photo.thumb_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

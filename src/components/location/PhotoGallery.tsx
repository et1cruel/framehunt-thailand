import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X, ZoomIn, ZoomOut, ExternalLink, ImageOff, LoaderCircle } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import type { LocationPhoto } from "@/data/types";
import { cn } from "@/lib/utils";
import { loadPhotoGallery } from "@/services/photoGalleries";

interface Props {
  photos: LocationPhoto[];
  locationName: string;
  galleryAssetUrl?: string;
  expectedPhotoCount?: number;
  className?: string;
}

export function PhotoGallery({ photos: initialPhotos, locationName, galleryAssetUrl, expectedPhotoCount, className }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [loadingArchive, setLoadingArchive] = useState(Boolean(galleryAssetUrl));
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [failedPhotoIds, setFailedPhotoIds] = useState<Set<string>>(() => new Set());
  const [failedThumbIds, setFailedThumbIds] = useState<Set<string>>(() => new Set());
  const touchX = useRef<number | null>(null);

  const loadArchive = useCallback(() => {
    if (!galleryAssetUrl) {
      setLoadingArchive(false);
      return;
    }
    setLoadingArchive(true);
    setArchiveError(null);
    void loadPhotoGallery(galleryAssetUrl, expectedPhotoCount ?? initialPhotos.length)
      .then((nextPhotos) => {
        setPhotos(nextPhotos);
        setActive(0);
        setFailedPhotoIds(new Set());
        setFailedThumbIds(new Set());
      })
      .catch((error: unknown) => setArchiveError(error instanceof Error ? error.message : "โหลดคลังภาพไม่สำเร็จ"))
      .finally(() => setLoadingArchive(false));
  }, [expectedPhotoCount, galleryAssetUrl, initialPhotos]);

  useEffect(() => {
    setPhotos(initialPhotos);
    setActive(0);
    setFailedPhotoIds(new Set());
    loadArchive();
  }, [initialPhotos, loadArchive]);

  const count = photos.length;
  const current = photos[active];
  const go = useCallback((delta: number) => {
    setActive((index) => (count ? (index + delta + count) % count : 0));
    setZoom(false);
  }, [count]);

  const handlePhotoError = useCallback((photoId: string) => {
    const failedIndex = photos.findIndex((photo) => photo.id === photoId);
    setFailedPhotoIds((previous) => new Set(previous).add(photoId));
    const nextIndex = photos.findIndex((photo, index) => index !== failedIndex && !failedPhotoIds.has(photo.id));
    if (nextIndex >= 0) {
      setActive(nextIndex);
      setZoom(false);
    }
  }, [failedPhotoIds, photos]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!count || !current) {
    return (
      <div className={cn("clay-panel flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center", className)}>
        {loadingArchive ? <LoaderCircle className="h-6 w-6 animate-spin text-acid" /> : <ImageOff className="h-6 w-6 text-concrete" />}
        <p className="text-sm text-concrete">{loadingArchive ? "กำลังโหลดภาพทั้งหมดของสถานที่นี้…" : "ยังโหลดภาพสถานที่ไม่ได้"}</p>
        {archiveError && <button type="button" onClick={loadArchive} className="rounded-full border border-line px-4 py-2 text-xs hover:border-acid hover:text-acid">ลองโหลดอีกครั้ง</button>}
      </div>
    );
  }

  const unavailable = failedPhotoIds.has(current.id);
  const displayCount = expectedPhotoCount ?? count;
  const attribution = (
    <>
      © {current.photographer}{current.credit ? ` · ${current.credit}` : ""} · {current.license} ·{" "}
      <a href={current.source_page_url} target="_blank" rel="noreferrer" className="underline decoration-paper/20 underline-offset-2 hover:text-acid">{current.source_name}</a>
    </>
  );

  return (
    <div className={cn("", className)}>
      {archiveError && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white/50 px-3 py-2 text-xs text-concrete">
          <span>โหลดอัลบั้มไม่สำเร็จ · แสดง {count} จาก {displayCount} ภาพ</span>
          <button type="button" onClick={loadArchive} className="font-semibold text-[#315b50] underline underline-offset-2">ลองใหม่</button>
        </div>
      )}
      <div className="media-inverse relative aspect-[16/10] overflow-hidden rounded-2xl bg-ink-2 md:aspect-[16/9]">
        <AnimatePresence mode="wait">
          {unavailable ? (
            <motion.div key={`unavailable-${current.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-2 p-5 text-center text-concrete">
              <ImageOff className="h-7 w-7" />
              <p className="text-sm">ภาพนี้เปิดไม่ได้ · ข้ามไปภาพอื่นได้</p>
              <a href={current.source_page_url} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2 hover:text-acid">ตรวจสอบภาพต้นทาง</a>
            </motion.div>
          ) : (
            <motion.img
              key={current.id}
              src={current.image_url}
              srcSet={`${current.thumb_url} 500w, ${current.image_url} 1920w`}
              sizes="(max-width: 1024px) 100vw, 70vw"
              alt={`${locationName} — ${current.title}`}
              width={current.width}
              height={current.height}
              loading="eager"
              decoding="async"
              onError={() => handlePhotoError(current.id)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full w-full object-cover"
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-ink/70 to-transparent p-3 md:p-4">
          <span className="rounded-full border border-paper/25 bg-ink/90 px-2 py-1 font-mono text-xs tracking-normal text-paper/85 backdrop-blur-sm">{active + 1} / {displayCount}</span>
          <button type="button" onClick={() => setOpen(true)} className="flex h-9 items-center gap-2 border border-paper/30 bg-ink/90 px-3 font-mono text-xs tracking-normal text-paper backdrop-blur-sm transition-colors hover:border-acid hover:text-acid" aria-label="เปิดภาพเต็มจอ">
            <Expand className="h-3.5 w-3.5" /><span className="hidden sm:inline">VIEW FULL</span>
          </button>
        </div>

        <button type="button" onClick={() => go(-1)} aria-label="ภาพก่อนหน้า" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-paper/25 bg-ink/90 text-paper backdrop-blur-sm transition-colors hover:border-acid hover:text-acid"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => go(1)} aria-label="ภาพถัดไป" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-paper/25 bg-ink/90 text-paper backdrop-blur-sm transition-colors hover:border-acid hover:text-acid"><ChevronRight className="h-5 w-5" /></button>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent p-3 md:p-4">
          <p className="truncate font-mono text-xs tracking-normal text-concrete">{attribution}</p>
        </div>
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 snap-x-mandatory" role="tablist" aria-label="แกลเลอรีภาพ">
        {photos.map((photo, index) => (
          <button key={photo.id} type="button" role="tab" aria-selected={index === active} aria-label={`ภาพที่ ${index + 1}: ${photo.title}`} onClick={() => { setActive(index); setZoom(false); }} className={cn("relative h-16 w-24 shrink-0 overflow-hidden border transition-all snap-start md:h-20 md:w-28", index === active ? "border-acid opacity-100" : "border-transparent opacity-55 hover:opacity-90")}>
            {failedThumbIds.has(photo.id) ? <span className="flex h-full items-center justify-center bg-ink-2 text-concrete"><ImageOff className="h-4 w-4" /></span> : <img src={photo.thumb_url} alt="" loading="lazy" decoding="async" onError={() => setFailedThumbIds((previous) => new Set(previous).add(photo.id))} className="h-full w-full object-cover" />}
          </button>
        ))}
        {loadingArchive && <span className="flex h-16 shrink-0 items-center gap-2 px-2 text-xs text-concrete"><LoaderCircle className="h-4 w-4 animate-spin" /> โหลดภาพเพิ่มเติม</span>}
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-[#202c40]/95 backdrop-blur-sm" />
          <DialogPrimitive.Content className="media-inverse fixed inset-0 z-[60] flex flex-col outline-none" aria-describedby={undefined} onTouchStart={(event) => (touchX.current = event.touches[0].clientX)} onTouchEnd={(event) => {
            if (touchX.current == null) return;
            const delta = event.changedTouches[0].clientX - touchX.current;
            if (Math.abs(delta) > 50) go(delta > 0 ? -1 : 1);
            touchX.current = null;
          }}>
            <DialogPrimitive.Title className="sr-only">{locationName} — แกลเลอรีภาพ</DialogPrimitive.Title>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-baseline gap-3"><span className="font-mono text-xs text-acid">{String(active + 1).padStart(2, "0")}</span><span className="font-mono text-xs tracking-normal text-concrete">/ {String(displayCount).padStart(2, "0")}</span><span className="hidden max-w-[40vw] truncate font-sans text-xs text-concrete sm:block">{current.title}</span></div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setZoom((value) => !value)} className="flex h-10 w-10 items-center justify-center border border-line text-concrete hover:border-acid hover:text-acid" aria-label={zoom ? "ย่อภาพ" : "ขยายภาพ"}>{zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}</button>
                <a href={current.source_page_url} target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center border border-line text-concrete hover:border-acid hover:text-acid" aria-label="เปิดหน้าต้นทางภาพ"><ExternalLink className="h-4 w-4" /></a>
                <DialogPrimitive.Close className="flex h-10 w-10 items-center justify-center border border-line text-paper hover:border-acid hover:text-acid" aria-label="ปิดแกลเลอรี"><X className="h-4 w-4" /></DialogPrimitive.Close>
              </div>
            </div>
            <div className={cn("relative flex flex-1 items-center justify-center overflow-auto p-2 md:p-6", zoom && "items-start")}>
              {unavailable ? <div className="flex flex-col items-center gap-3 text-concrete"><ImageOff className="h-8 w-8" /><span>ภาพนี้เปิดไม่ได้</span><a href={current.source_page_url} target="_blank" rel="noreferrer" className="text-xs underline hover:text-acid">ภาพต้นทาง</a></div> : <img src={current.image_url} alt={`${locationName} — ${current.title}`} onError={() => handlePhotoError(current.id)} onClick={() => setZoom((value) => !value)} className={cn("max-h-full max-w-full object-contain transition-transform duration-300", zoom ? "max-h-none max-w-none scale-150 cursor-zoom-out" : "cursor-zoom-in")} />}
              <button type="button" onClick={() => go(-1)} aria-label="ภาพก่อนหน้า" className="fixed left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-paper/20 bg-ink/70 text-paper hover:border-acid hover:text-acid md:left-6"><ChevronLeft className="h-6 w-6" /></button>
              <button type="button" onClick={() => go(1)} aria-label="ภาพถัดไป" className="fixed right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-paper/20 bg-ink/70 text-paper hover:border-acid hover:text-acid md:right-6"><ChevronRight className="h-6 w-6" /></button>
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="font-sans text-xs text-concrete">© {current.photographer}{current.credit ? ` · ${current.credit}` : ""} · {current.license_url ? <a href={current.license_url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-acid">{current.license}</a> : current.license} · {current.width}×{current.height}</p>
                <p className="font-mono text-xs tracking-normal text-concrete">{current.verification_status} · {current.subject_evidence}</p>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => <button key={photo.id} type="button" onClick={() => { setActive(index); setZoom(false); }} aria-label={`ไปยังภาพที่ ${index + 1}`} aria-current={index === active} className={cn("h-12 w-16 shrink-0 overflow-hidden border", index === active ? "border-acid" : "border-transparent opacity-45 hover:opacity-80")}>{failedThumbIds.has(photo.id) ? <span className="flex h-full items-center justify-center bg-ink-2 text-concrete"><ImageOff className="h-4 w-4" /></span> : <img src={photo.thumb_url} alt="" loading="lazy" onError={() => setFailedThumbIds((previous) => new Set(previous).add(photo.id))} className="h-full w-full object-cover" />}</button>)}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

import { Localized, useLanguage } from "@/i18n/Language";
import { useState } from "react";
import { ImageOff, LoaderCircle, RefreshCw } from "lucide-react";
import { findDirectoryCover, useDirectoryCovers } from "@/services/directoryCovers";

export function DirectoryCover({ name, province, source }: { name: string; province: string; source?: string }) {
  const [failed, setFailed] = useState(false);
  const { t } = useLanguage();
  const { data: coverIndex, isPending, isError, refetch } = useDirectoryCovers();
  const cover = findDirectoryCover(coverIndex, name, province, source);
  const url = cover?.url.startsWith("https://prod-pics.guide.michelin.com/") ? `${cover.url}&w=500&h=300` : cover?.url;
  const sourceUrl = cover?.source || source;
  return (
    <div className="relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-[inherit] bg-lilac/50">
      {cover && !failed ? <>
        <img className="aspect-[5/3] w-full object-cover" src={url} alt={`${t("ภาพของ")} ${name}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        <a href={cover.source} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 max-w-[90%] rounded-md bg-black/75 px-2 py-1 text-[10px] leading-snug text-white">{cover.credit}</a>
      </> : <div className="flex aspect-[5/3] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-[#526175]" aria-busy={isPending}>
        <span className="flex items-center gap-2">
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ImageOff className="h-4 w-4" aria-hidden />}
          <Localized text={isPending ? "กำลังโหลดภาพสถานที่" : failed ? "รูปภาพเปิดไม่ขึ้น" : isError ? "โหลดข้อมูลภาพไม่สำเร็จ" : "ยังไม่มีภาพสถานที่"} />
        </span>
        {isError && <button type="button" onClick={() => void refetch()} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#315b50] underline decoration-sage underline-offset-2 hover:bg-white/70"><RefreshCw className="h-3 w-3" aria-hidden /> <Localized text="ลองอีกครั้ง" /></button>}
        {sourceUrl && !isPending && <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#315b50] underline decoration-sage underline-offset-2 hover:bg-white/70"><Localized text="เปิดแหล่งข้อมูล" /></a>}
      </div>}
    </div>
  );
}

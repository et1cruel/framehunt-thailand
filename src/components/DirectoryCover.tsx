import { Localized } from "@/i18n/Language";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import covers from "@/data/directory-covers.json";

type Cover = { url: string; source: string; credit: string };
const coverIndex = covers as Record<string, Cover>;

export function hasDirectoryCover(name: string, province: string, source?: string) {
  return Boolean(coverIndex[`${name}|${province}`] || (source ? coverIndex[source] : undefined));
}

export function DirectoryCover({ name, province, source }: { name: string; province: string; source?: string }) {
  const [failed, setFailed] = useState(false);
  const cover = coverIndex[`${name}|${province}`] || (source ? coverIndex[source] : undefined);
  const url = cover?.url.startsWith("https://prod-pics.guide.michelin.com/") ? `${cover.url}&w=500&h=300` : cover?.url;
  const sourceUrl = cover?.source || source;
  return (
    <div className="relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-[inherit] bg-lilac/50">
      {cover && !failed ? <>
        <img className="aspect-[5/3] w-full object-cover" src={url} alt={`ภาพ ${name}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        <a href={cover.source} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 max-w-[90%] rounded-md bg-black/75 px-2 py-1 text-[10px] leading-snug text-white">{cover.credit}</a>
      </> : <div className="flex aspect-[5/3] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-[#526b68]">
        <span className="flex items-center gap-2"><ImageOff className="h-4 w-4" aria-hidden /> <Localized text={cover ? "รูปภาพเปิดไม่ขึ้น" : "ยังไม่มีภาพสถานที่"} /></span>
        {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#315b50] underline decoration-sage underline-offset-2 hover:bg-white/70"><Localized text="เปิดแหล่งข้อมูล" /></a>}
      </div>}
    </div>
  );
}

import { useState } from "react";
import { ImageOff } from "lucide-react";
import covers from "@/data/directory-covers.json";

type Cover = { url: string; source: string; credit: string };
const coverIndex = covers as Record<string, Cover>;

export function hasDirectoryCover(name: string, province: string) {
  return Boolean(coverIndex[`${name}|${province}`]);
}

export function DirectoryCover({ name, province, source }: { name: string; province: string; source?: string }) {
  const [failed, setFailed] = useState(false);
  const cover = coverIndex[`${name}|${province}`] || (source ? coverIndex[source] : undefined);
  const url = cover?.url.startsWith("https://prod-pics.guide.michelin.com/") ? `${cover.url}&w=500&h=300` : cover?.url;
  return (
    <div className="relative -mx-5 -mt-5 mb-4 overflow-hidden rounded-t-[inherit] bg-lilac/50">
      {cover && !failed ? <>
        <img className="aspect-[5/3] w-full object-cover" src={url} alt={`ภาพ ${name}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />
        <a href={cover.source} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 max-w-[90%] rounded-md bg-black/75 px-2 py-1 text-[10px] leading-snug text-white">{cover.credit}</a>
      </> : <div className="flex aspect-[5/3] items-center justify-center gap-2 text-sm text-[#526b68]"><ImageOff className="h-4 w-4" aria-hidden /> ยังไม่มีภาพสถานที่</div>}
    </div>
  );
}

import { SearchX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";

interface Props {
  title?: string;
  body?: string;
  actionLabel?: string;
  actionHref?: string;
  onReset?: () => void;
  suggestions?: { label: string; href: string }[];
}

export function EmptyState({
  title = "ไม่พบสถานที่ที่ตรงกับเงื่อนไข",
  body = "ลองลดตัวกรองลง เปลี่ยนคำค้นหา หรือเริ่มจากบรรยากาศของเพลงที่คุณกำลังทำ",
  actionLabel = "ดูสถานที่ทั้งหมด",
  actionHref = "/explore",
  onReset,
  suggestions = [],
}: Props) {
  return (
    <div className="flex flex-col items-center border border-dashed border-paper/15 px-6 py-20 text-center">
      <SearchX className="h-8 w-8 text-concrete" strokeWidth={1.2} />
      <h3 className="mt-5 font-display text-2xl font-extrabold">{title}</h3>
      <p className="mt-2 max-w-md font-sans text-sm leading-relaxed text-concrete">{body}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {onReset && (
          <Button variant="primary" onClick={onReset}>
            ล้างตัวกรอง
          </Button>
        )}
        <Link to={actionHref}>
          <Button variant="outline">{actionLabel}</Button>
        </Link>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-8 w-full max-w-md border-t border-line pt-5">
          <p className="label-mono mb-3 text-concrete">ลองสิ่งเหล่านี้</p>
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <Link
                key={s.href + s.label}
                to={s.href}
                className="group flex items-center justify-between border-b border-line pb-2 font-sans text-sm text-concrete hover:text-acid"
              >
                {s.label}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

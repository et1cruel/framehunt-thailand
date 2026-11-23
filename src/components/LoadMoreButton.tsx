import { Localized, useLanguage } from "@/i18n/Language";
import { ArrowDown } from "lucide-react";

export function LoadMoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  const { t } = useLanguage();
  if (remaining <= 0) return null;

  return (
    <div className="mt-8 flex justify-center">
      <button
        type="button"
        className="clay-control inline-flex min-h-11 items-center gap-2 border border-white bg-white/80 px-5 py-2 text-sm font-semibold text-[#315b50] transition-colors hover:bg-sage"
        onClick={onClick}
        aria-label={`${t("โหลดสถานที่เพิ่มเติม")} (${remaining})`}
      >
        <Localized text="โหลดเพิ่ม" /> <span>({remaining})</span>
        <ArrowDown className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

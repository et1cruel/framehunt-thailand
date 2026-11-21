import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, MapPin, Tag, Sparkles, X } from "lucide-react";
import { useLocationCatalog } from "@/services/catalogContext";
import type { Suggestion } from "@/services/locations";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  placeholder?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
  className?: string;
  showButton?: boolean;
}

const ICONS = {
  location: MapPin,
  province: MapPin,
  category: Tag,
  mood: Sparkles,
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "ชื่อสถานที่ จังหวัด หรือบรรยากาศ…",
  size = "md",
  autoFocus,
  className,
  showButton = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { suggest } = useLocationCatalog();
  const items = useMemo(() => suggest(value, 7), [suggest, value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function submit() {
    onSubmit?.(value);
    setOpen(false);
  }

  function pick(item: Suggestion) {
    setOpen(false);
    navigate(item.href);
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "flex items-center rounded-2xl border border-line bg-white/85 shadow-clay backdrop-blur transition-colors focus-within:border-acid focus-within:ring-2 focus-within:ring-acid/30",
          size === "lg" ? "h-14" : "h-12",
        )}
        role="search"
      >
        <Search className={cn("ml-4 shrink-0 text-concrete", size === "lg" ? "h-5 w-5" : "h-4 w-4")} />
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !items.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + items.length) % items.length);
            } else if (e.key === "Enter" && items[active]) {
              e.preventDefault();
              pick(items[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label="ค้นหาโลเคชัน"
          aria-autocomplete="list"
          aria-expanded={open && items.length > 0}
          aria-controls="search-suggestions"
          className="min-w-0 flex-1 bg-transparent px-3 text-base text-paper placeholder:text-concrete focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="mr-1 flex h-8 w-8 items-center justify-center text-concrete hover:text-paper"
            aria-label="ล้างคำค้นหา"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {showButton && (
          <button
            type="submit"
            aria-label="ค้นหา"
            className={cn(
              "mr-1.5 flex shrink-0 items-center gap-2 rounded-xl bg-acid text-sm font-semibold text-ink transition-colors hover:bg-paper",
              size === "lg" ? "h-11 px-3 sm:px-4" : "h-9 px-3",
            )}
          >
            <span className="hidden sm:inline">ค้นหา</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </form>

      {open && items.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white bg-ink shadow-glass"
        >
          {items.map((item, i) => {
            const Icon = ICONS[item.type];
            return (
              <button
                key={`${item.type}-${item.label}-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-none border-b border-line px-4 py-3 text-left transition-colors last:border-0",
                  i === active ? "bg-sage" : "",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-acid" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-sans text-sm text-paper">{item.label}</span>
                  <span className="block truncate font-mono text-xs tracking-normal text-concrete">{item.sub}</span>
                </span>
                <ArrowRight className="h-3 w-3 text-concrete" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

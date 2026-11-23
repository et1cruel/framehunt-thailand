import { useLanguage } from "@/i18n/Language";
import { Localized } from "@/i18n/Language";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Focus, ArrowUpRight, Heart, Menu, Search, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/services/localStore";

const NAV = [
  { to: "/explore", label: "ค้นหาโลเคชัน" },
  { to: "/live-music", label: "ดนตรีสด" },
  { to: "/studios", label: "ห้องซ้อมดนตรี" },
  { to: "/secondhand", label: "มือสองทั่วไทย" },
  { to: "/food", label: "กินทั่วไทย" },
  { to: "/activities", label: "กิจกรรมทั่วไทย" },
  { to: "/map", label: "แผนที่" },
  { to: "/find-my-vibe", label: "Find My Vibe" },
  { to: "/boards", label: "บอร์ด" },
  { to: "/submit", label: "เสนอสถานที่" },
];

const PRIMARY_PATHS = new Set(["/explore", "/live-music", "/secondhand", "/food", "/activities"]);
const PRIMARY_NAV = NAV.filter((item) => PRIMARY_PATHS.has(item.to));
const MORE_NAV = NAV.filter((item) => !PRIMARY_PATHS.has(item.to));

const iconClass =
  "clay-control relative grid h-10 w-10 place-items-center border border-white bg-ink/85 text-paper hover:bg-sage hover:text-acid";

export function Header() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { favorites } = useFavorites();
  const { pathname } = useLocation();
  const moreMenuRef = useRef<HTMLDetailsElement>(null);
  const moreActive = MORE_NAV.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    const closeWhenOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !moreMenuRef.current?.contains(event.target) && moreMenuRef.current) {
        moreMenuRef.current.open = false;
      }
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    return () => document.removeEventListener("pointerdown", closeWhenOutside);
  }, []);

  function closeMoreMenu() {
    if (moreMenuRef.current) moreMenuRef.current.open = false;
  }

  return (
    <header className="site-header sticky top-0 z-40 px-3 pt-2 sm:px-5 sm:pt-3">
      <div className="glass-panel mx-auto flex min-h-[4.15rem] max-w-[89rem] items-center justify-between gap-2 px-2.5 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label={t("FRAMEHUNT THAILAND — หน้าแรก")}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-acid text-ink shadow-clay">
            <Focus className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-[0.98rem] font-extrabold leading-tight tracking-tight sm:text-lg">
              Framehunt
            </span>
            <span className="block text-xs leading-tight text-concrete">Thailand</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 shrink items-center gap-0.5 lg:flex" aria-label={t("เมนูหลัก")}>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors hover:bg-white/75 hover:text-acid",
                  isActive ? "bg-sage text-acid" : "text-concrete",
                )
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
          <details ref={moreMenuRef} className="group relative shrink-0" onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeMoreMenu();
              moreMenuRef.current?.querySelector<HTMLElement>("summary")?.focus();
            }
          }}>
            <summary className={cn(
              "nav-more-trigger flex min-h-10 cursor-pointer list-none items-center gap-1 rounded-xl border border-transparent px-2.5 py-2 text-sm font-semibold transition-colors hover:bg-white/75 hover:text-acid focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden",
              moreActive ? "bg-sage text-acid" : "text-concrete",
            )}>
              {t("เพิ่มเติม")}<ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="nav-more-menu absolute right-0 top-full z-50 mt-2 min-w-56 rounded-2xl border border-white bg-ink/95 p-2 shadow-glass backdrop-blur-xl">
              {MORE_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMoreMenu}
                  className={({ isActive }) => cn(
                    "flex min-h-11 items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-sage hover:text-acid",
                    isActive ? "bg-sage text-acid" : "text-paper",
                  )}
                >
                  {t(item.label)}<ArrowUpRight className="h-3.5 w-3.5 text-acid" aria-hidden="true" />
                </NavLink>
              ))}
              <Link to="/admin" onClick={closeMoreMenu} className="mt-1 flex min-h-10 items-center rounded-xl px-3 py-2 text-sm text-concrete transition-colors hover:bg-sage hover:text-acid">{t("สำหรับผู้ดูแล")}</Link>
            </div>
          </details>
        </nav>

        <div className="flex shrink-0 gap-1.5"><div role="group" aria-label="Language" className="flex items-center rounded-xl bg-white/80 p-1">{(["en", "th"] as const).map((code) => <button key={code} type="button" aria-label={code === "en" ? "English" : "ภาษาไทย"} aria-pressed={language === code} onClick={() => setLanguage(code)} className={cn("rounded-lg px-2 py-2 text-xs font-bold text-acid", language === code && "bg-sage")}>{code.toUpperCase()}</button>)}</div>
          <Link to="/explore" className={cn(iconClass, "hidden sm:grid")} aria-label={t("ไปหน้าค้นหา")}>
            <Search className="h-4 w-4" />
          </Link>
          <Link to="/boards" className={iconClass} aria-label={`${t("รายการโปรด")}: ${favorites.length}`}>
            <Heart className="h-4 w-4" />
            {favorites.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-white bg-acid px-1 text-xs font-bold text-ink">
                {favorites.length}
              </span>
            )}
          </Link>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button type="button" className={cn(iconClass, "lg:hidden")} aria-label={t("เปิดเมนู")}>
                <Menu className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogTitle className="mb-5 pr-12 font-display text-2xl"> <Localized text="เมนู Framehunt" /> </DialogTitle>
              <nav className="grid gap-2" aria-label={t("เมนูมือถือ")}>
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-semibold hover:bg-sage",
                        isActive ? "bg-sage text-acid" : "bg-ink/75 text-paper",
                      )
                    }
                  >
                    {t(item.label)}
                    <ArrowUpRight className="h-4 w-4 text-acid" />
                  </NavLink>
                ))}
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="mt-2 px-4 py-2 text-sm text-concrete hover:text-acid"
                > <Localized text="สำหรับผู้ดูแล" /> </Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

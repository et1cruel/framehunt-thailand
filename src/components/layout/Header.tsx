import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Focus, ArrowUpRight, Heart, Menu, Search } from "lucide-react";
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

const iconClass =
  "clay-control relative grid h-10 w-10 place-items-center border border-white bg-ink/85 text-paper hover:bg-sage hover:text-acid";

export function Header() {
  const [open, setOpen] = useState(false);
  const { favorites } = useFavorites();

  return (
    <header className="site-header sticky top-0 z-40 px-3 pt-2 sm:px-5 sm:pt-3">
      <div className="glass-panel mx-auto flex min-h-[4.15rem] max-w-[89rem] items-center justify-between gap-2 px-2.5 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="FRAMEHUNT THAILAND — หน้าแรก">
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

        <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหลัก">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-white/75 hover:text-acid",
                  isActive ? "bg-sage text-acid" : "text-concrete",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 gap-1.5">
          <Link to="/explore" className={cn(iconClass, "hidden sm:grid")} aria-label="ไปหน้าค้นหา">
            <Search className="h-4 w-4" />
          </Link>
          <Link to="/boards" className={iconClass} aria-label={"รายการโปรด " + favorites.length + " รายการ"}>
            <Heart className="h-4 w-4" />
            {favorites.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border border-white bg-acid px-1 text-xs font-bold text-ink">
                {favorites.length}
              </span>
            )}
          </Link>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button type="button" className={cn(iconClass, "lg:hidden")} aria-label="เปิดเมนู">
                <Menu className="h-5 w-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby={undefined}>
              <DialogTitle className="mb-5 pr-12 font-display text-2xl">เมนู Framehunt</DialogTitle>
              <nav className="grid gap-2" aria-label="เมนูมือถือ">
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
                    {item.label}
                    <ArrowUpRight className="h-4 w-4 text-acid" />
                  </NavLink>
                ))}
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="mt-2 px-4 py-2 text-sm text-concrete hover:text-acid"
                >
                  สำหรับผู้ดูแล
                </Link>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

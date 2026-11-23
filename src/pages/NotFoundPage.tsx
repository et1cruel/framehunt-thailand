import { Localized } from "@/i18n/Language";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Map, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";

export default function NotFoundPage() {
  const location = useLocation();
  useSeo({ title: "ไม่พบหน้าที่ต้องการ", noindex: true });

  return (
    <div className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="select-none font-display text-[38vw] font-black leading-none text-paper/[0.035]">404</span>
      </div>

      <div className="container-x relative py-20">
        <p className="label-mono text-burnt">FRAME NOT FOUND</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight md:text-7xl">
          <Localized text={"หน้านี้"} /><br />
          <span className="text-outline"><Localized text={"หลุดเฟรม"} /></span>
        </h1>
        <p className="mt-6 max-w-lg font-sans text-sm leading-relaxed text-concrete">
          <Localized text={"ไม่พบเส้นทาง"} />{" "}
          <code className="border border-line px-1.5 py-0.5 font-mono text-xs text-concrete">{location.pathname}</code>{" "}
          <Localized text={"ในระบบ อาจเป็นลิงก์เก่า ลิงก์ที่พิมพ์ผิด หรือโลเคชันที่ถูกเปลี่ยนสถานะเป็นฉบับร่าง"} /></p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/explore">
            <Button>
              <Search className="h-3.5 w-3.5" /> <Localized text="ค้นหาโลเคชัน" /> </Button>
          </Link>
          <Link to="/map">
            <Button variant="outline">
              <Map className="h-3.5 w-3.5" /> <Localized text="เปิดแผนที่" /> </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="h-3.5 w-3.5" /> <Localized text={"กลับหน้าแรก"} /></Button>
          </Link>
        </div>

        <div className="mt-14 grid max-w-2xl gap-px bg-line sm:grid-cols-3">
          {[
            { to: "/find-my-vibe", label: "FIND MY VIBE", icon: Compass },
            { to: "/boards", label: "MV BOARDS", icon: Map },
            { to: "/submit", label: "SUBMIT A PLACE", icon: Search },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center justify-between gap-3 bg-ink p-4 transition-colors hover:bg-ink-2"
            >
              <span className="font-mono text-xs tracking-normal text-concrete group-hover:text-acid">
                {item.label}
              </span>
              <item.icon className="h-3.5 w-3.5 text-concrete group-hover:text-acid" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

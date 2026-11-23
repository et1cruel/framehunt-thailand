import { Localized } from "@/i18n/Language";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/services/auth";
import { Button } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { user, loading, mode } = useAuth();
  const destination = user?.role === "admin" ? "/admin" : "/boards";
  useSeo({ title: "เข้าสู่ระบบ", noindex: true });

  useEffect(() => {
    if (!loading && user) {
      const timer = window.setTimeout(() => navigate(destination, { replace: true }), 1400);
      return () => window.clearTimeout(timer);
    }
  }, [loading, user, destination, navigate]);

  return (
    <div className="container-x flex min-h-[60vh] items-center justify-center py-20">
      <div className="w-full max-w-md border border-line p-8 text-center">
        {loading ? (
          <>
            <span className="mx-auto block h-6 w-6 animate-spin rounded-full border-2 border-paper/15 border-t-acid" />
            <h1 className="display mt-6 text-3xl"><Localized text={"กำลังตรวจสอบเซสชัน"} /></h1>
            <p className="mt-3 font-sans text-sm text-concrete"><Localized text={"รอสักครู่ ระบบกำลังยืนยันลิงก์เข้าสู่ระบบ"} /></p>
          </>
        ) : user ? (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-acid" />
            <h1 className="display mt-6 text-3xl"><Localized text={"เข้าสู่ระบบแล้ว"} /></h1>
            <p className="mt-3 font-sans text-sm text-concrete">
              {user.email} · {destination === "/admin" ? "กำลังเปิดหน้าแอดมิน" : "กำลังเปิดบอร์ดโปรเจกต์"}
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-10 w-10 text-burnt" />
            <h1 className="display mt-6 text-3xl"><Localized text={"ลิงก์หมดอายุหรือไม่ถูกต้อง"} /></h1>
            <p className="mt-3 font-sans text-sm leading-relaxed text-concrete">
              {mode === "local"
                ? "โหมดเครื่องนี้ไม่ใช้ลิงก์อีเมล — เข้าสู่ระบบจากหน้า Admin หรือใช้โหมดเครื่องนี้ต่อได้ทันที"
                : "ขออีเมลใหม่จากหน้าเข้าสู่ระบบ แล้วเปิดลิงก์ล่าสุดจากกล่องจดหมายของคุณ"}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => navigate("/boards")}><Localized text={"ไปที่บอร์ด"} /></Button>
              <Button variant="outline" onClick={() => navigate("/admin")}>
                <Localized text={"หน้า Admin"} /></Button>
            </div>
          </>
        )}
        <p className="mt-8 font-mono text-xs tracking-normal text-concrete">
          <Link to="/" className="hover:text-acid">
            FRAMEHUNT THAILAND
          </Link>
        </p>
      </div>
    </div>
  );
}

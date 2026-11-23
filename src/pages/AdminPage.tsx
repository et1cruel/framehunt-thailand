import { Localized } from "@/i18n/Language";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Download,
  FileWarning,
  Flag,
  Inbox,
  LayoutDashboard,
  Lock,
  MapPin,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import reportJson from "../../data/reports/ingest-report.json";
import { Badge, Button, Dialog, DialogContent, DialogTitle, Input, Label, Select } from "@/components/ui";
import {
  allRecords,
  draftLocations,
  locationStats,
  publishedLocations,
} from "@/services/adminLocations";
import { datasetMeta, photoGate } from "@/services/locations";
import { admin as adminStore, auth, submissions as submissionStore, useStore } from "@/services/localStore";
import { useAuth } from "@/services/auth";
import { allowLocalAuth } from "@/lib/supabase";
import { HostedAdmin } from "@/components/location/HostedAdmin";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn, downloadJson, formatThaiDate } from "@/lib/utils";
import { useSeo } from "@/lib/useSeo";
import type { ContentReport, LocationRecord, Submission, SubmissionStatus } from "@/data/types";

type Tab = "overview" | "locations" | "submissions" | "reports" | "data";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "OVERVIEW", icon: LayoutDashboard },
  { id: "locations", label: "LOCATIONS", icon: MapPin },
  { id: "submissions", label: "SUBMISSIONS", icon: Inbox },
  { id: "reports", label: "REPORTS", icon: Flag },
  { id: "data", label: "DATA QUALITY", icon: Database },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "รอตรวจ",
  reviewing: "กำลังตรวจ",
  accepted: "รับเข้าคิว",
  rejected: "ปฏิเสธ",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "border-paper/25 text-concrete",
  reviewing: "border-acid/50 text-acid",
  accepted: "border-acid bg-acid/10 text-acid",
  rejected: "border-burnt/60 text-burnt",
};

function readReports(): ContentReport[] {
  try {
    const raw = JSON.parse(localStorage.getItem("framehunt:reports") ?? "[]") as Partial<ContentReport>[];
    return raw.map((r) => ({
      id: r.id ?? `report_${Math.random().toString(36).slice(2)}`,
      locationSlug: r.locationSlug ?? "",
      reason: r.reason ?? "ไม่ระบุ",
      detail: r.detail ?? "",
      createdAt: r.createdAt ?? new Date().toISOString(),
      status: r.status ?? "open",
    }));
  } catch {
    return [];
  }
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "acid" | "burnt";
}) {
  return (
    <div className="border border-line p-4 md:p-5">
      <p className="label-mono text-concrete">{label}</p>
      <p
        className={cn(
          "mt-3 font-display text-3xl font-extrabold leading-none md:text-4xl",
          tone === "acid" && "text-acid",
          tone === "burnt" && "text-burnt",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-2 font-sans text-xs leading-relaxed text-concrete">{sub}</p>}
    </div>
  );
}

function LoginGate() {
  const { mode, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRemote() {
    if (!email) return;
    setBusy(true);
    const result = await signInWithEmail(email);
    setBusy(false);
    setMessage(result.error ? `ส่งไม่สำเร็จ: ${result.error}` : "ส่งลิงก์เข้าสู่ระบบแล้ว — ตรวจกล่องจดหมายของคุณ");
  }

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-20">
      <div className="w-full max-w-lg border border-line">
        <div className="border-b border-line bg-ink-2 p-6">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-burnt" aria-hidden />
            <p className="label-mono text-burnt">RESTRICTED AREA</p>
          </div>
          <h1 className="display mt-3 text-4xl">ADMIN ACCESS</h1>
          <p className="mt-3 font-sans text-sm leading-relaxed text-concrete">
            {mode === "local"
              ? "สภาพแวดล้อมนี้ยังไม่ได้เชื่อมต่อ Supabase — การเข้าสู่ระบบด้านล่างเป็นโหมดเครื่องนี้เท่านั้น ไม่ใช่ระบบยืนยันตัวตนที่ปลอดภัย"
              : "เข้าสู่ระบบด้วยอีเมลองค์กรที่ได้รับสิทธิ์ admin"}
          </p>
        </div>

        <div className="space-y-4 p-6">
          {mode === "local" ? (
            <>
              <div className="flex items-start gap-2 border border-burnt/40 bg-burnt/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-burnt" aria-hidden />
                <p className="font-sans text-xs leading-relaxed text-concrete">
                  <strong className="text-paper/80">DEMO AUTH:</strong> ใครก็ตามที่เข้าถึงเบราว์เซอร์นี้สามารถเปิดหน้าแอดมินได้
                  ห้ามใช้ใน production จนกว่าจะตั้งค่า Supabase Auth และ role <code className="font-mono">admin</code>
                </p>
              </div>
              <div>
                <Label htmlFor="admin-name">ชื่อที่แสดง</Label>
                <Input
                  id="admin-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Local Admin"
                />
              </div>
              <div>
                <Label htmlFor="admin-email">อีเมล</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@local.test"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => auth.signInLocal(email || "admin@local.test", name || "Local Admin", "admin")}
              >
                เข้าสู่โหมดเครื่องนี้
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="admin-email">อีเมล</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                />
              </div>
              <Button className="w-full" onClick={handleRemote} disabled={busy || !email}>
                {busy ? "กำลังส่ง…" : "ส่งลิงก์เข้าสู่ระบบ"}
              </Button>
              {message && <p className="font-sans text-xs leading-relaxed text-concrete">{message}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, mode, loading, signOut } = useAuth();
  useSeo({ title: "Admin dashboard", noindex: true });

  if (loading)
    return (
      <p role="status" className="container-x py-20">
        กำลังตรวจสอบสิทธิ์…
      </p>
    );
  if (mode === "local" && !allowLocalAuth) {
    return <p className="container-x py-20">ต้องเชื่อมต่อ Supabase เพื่อใช้งานระบบแอดมิน</p>;
  }
  if (user && user.role !== "admin") {
    return (
      <div className="container-x space-y-4 py-20">
        <p role="alert">บัญชีนี้ไม่มีสิทธิ์แอดมิน</p>
        <Button onClick={() => void signOut()}>ออกจากระบบ</Button>
      </div>
    );
  }
  if (!user) return <LoginGate />;
  return mode === "supabase" ? <HostedAdmin /> : <LocalAdmin user={user} signOut={signOut} />;
}

function LocalAdmin({
  user,
  signOut,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  signOut: () => Promise<void>;
}) {
  const mode = "local" as const;
  const store = useStore();
  const stats = locationStats();
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<LocationRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("published");
  const [overrideNote, setOverrideNote] = useState("");
  const [subFilter, setSubFilter] = useState<"all" | SubmissionStatus>("all");
  const [reports, setReports] = useState<ContentReport[]>(readReports);
  const [reportFilter, setReportFilter] = useState<"all" | "open" | "resolved" | "dismissed">("all");

  const filteredLocations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRecords().filter((loc) => {
      if (statusFilter === "published" && !publishedLocations().some((l) => l.id === loc.id)) return false;
      if (statusFilter === "draft" && !draftLocations().some((l) => l.id === loc.id)) return false;
      if (!q) return true;
      return `${loc.name_th} ${loc.name_en} ${loc.province} ${loc.province_th} ${loc.slug}`.toLowerCase().includes(q);
    });
  }, [query, statusFilter]);

  const filteredSubs = useMemo(
    () => (subFilter === "all" ? store.submissions : store.submissions.filter((s) => s.status === subFilter)),
    [store.submissions, subFilter],
  );

  const filteredReports = useMemo(
    () => (reportFilter === "all" ? reports : reports.filter((r) => r.status === reportFilter)),
    [reports, reportFilter],
  );

  const rejectionSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reportJson.rejections) map.set(r.reason, (map.get(r.reason) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const photoRejectionSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reportJson.photo_rejections) map.set(r.reason, (map.get(r.reason) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  function persistReports(next: ContentReport[]) {
    setReports(next);
    try {
      localStorage.setItem("framehunt:reports", JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }

  function openLocation(loc: LocationRecord) {
    setSelected(loc);
    setOverrideStatus(store.adminOverrides[loc.id]?.status ?? loc.status);
    setOverrideNote(store.adminOverrides[loc.id]?.note ?? "");
  }

  function saveOverride() {
    if (!selected) return;
    adminStore.setOverride(selected.id, { status: overrideStatus, note: overrideNote });
    setSelected(null);
  }

  return (
    <div className="pb-24">
      {/* Top bar */}
      <div className="border-b border-line bg-ink-2">
        <div className="container-x flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="label-mono text-acid">INTERNAL / DASHBOARD</p>
            <h1 className="display mt-1 text-3xl md:text-4xl">ADMIN CONTROL</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="font-sans text-xs text-concrete">{user.email}</p>
              <p className="font-mono text-xs tracking-normal text-concrete">
                ROLE {user.role.toUpperCase()} · {mode.toUpperCase()} MODE
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              ออกจากระบบ
            </Button>
          </div>
        </div>
        {user.mode === "local" && (
          <div className="border-t border-burnt/30 bg-burnt/5">
            <div className="container-x flex items-start gap-2 py-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burnt" aria-hidden />
              <p className="font-sans text-xs leading-relaxed text-concrete">
                <strong className="text-burnt">LOCAL DEMO SESSION</strong> — ไม่มีการยืนยันตัวตนจริง
                การเปลี่ยนแปลงทั้งหมดเก็บในเบราว์เซอร์นี้ และไม่ถูกส่งขึ้นเซิร์ฟเวอร์
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-16 z-20 border-b border-line bg-ink/95 backdrop-blur md:top-20">
        <div className="container-x flex gap-1 overflow-x-auto">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 font-mono text-xs tracking-normal transition-colors md:px-4",
                  tab === item.id ? "border-acid text-acid" : "border-transparent text-concrete hover:text-paper",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {item.id === "submissions" && store.submissions.filter((s) => s.status === "pending").length > 0 && (
                  <span className="bg-burnt px-1 py-0.5 text-xs text-ink">
                    {store.submissions.filter((s) => s.status === "pending").length}
                  </span>
                )}
                {item.id === "reports" && reports.filter((r) => r.status === "open").length > 0 && (
                  <span className="bg-burnt px-1 py-0.5 text-xs text-ink">
                    {reports.filter((r) => r.status === "open").length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="container-x py-8 md:py-10">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="space-y-8">
            <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-6">
              <Stat label="PUBLISHED" value={stats.published} sub="ผ่านเกณฑ์ทุกข้อ" tone="acid" />
              <Stat label="DRAFT" value={stats.draft} sub="ยังไม่ครบ 5 ภาพ" tone="burnt" />
              <Stat label="VERIFIED PHOTOS" value={stats.verifiedPhotos} sub={`จาก ${stats.photographers} ช่างภาพ`} />
              <Stat label="PROVINCES" value={stats.provincesCovered} sub="จาก 77 จังหวัด" />
              <Stat label="REJECTED SEEDS" value={reportJson.counts.rejected} sub="ไม่มีข้อมูลพอ" />
              <Stat label="TOTAL RECORDS" value={stats.total} sub="รวม draft" />
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <section className="lg:col-span-7">
                <div className="border border-line">
                  <div className="flex items-center justify-between border-b border-line bg-ink-2 px-4 py-3">
                    <p className="label-mono text-concrete">COVERAGE BY ZONE</p>
                    <p className="font-mono text-xs text-concrete">
                      INGEST {new Date(datasetMeta.generated_at).toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <div className="divide-y divide-line">
                    {reportJson.by_zone.map((zone) => {
                      const total = zone.published + zone.draft;
                      return (
                        <div key={zone.zone} className="flex items-center gap-4 px-4 py-4">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-paper/20 font-display text-lg font-extrabold">
                            {zone.zone}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-sans text-sm text-paper/75">
                              {zone.zone === "A"
                                ? "กรุงเทพมหานคร"
                                : zone.zone === "B"
                                  ? "ปริมณฑล 5 จังหวัด"
                                  : "ต่างจังหวัด (77 จังหวัด)"}
                            </p>
                            <div className="mt-2 h-1.5 w-full bg-paper/10">
                              <div
                                className="h-full bg-acid"
                                style={{ width: `${total ? (zone.published / total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs text-concrete">{zone.published} PUB</p>
                            <p className="font-mono text-xs text-burnt">{zone.draft} DRAFT</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="lg:col-span-5">
                <div className="border border-line">
                  <div className="border-b border-line bg-ink-2 px-4 py-3">
                    <p className="label-mono text-concrete">SYSTEM STATUS</p>
                  </div>
                  <ul className="divide-y divide-line">
                    {[
                      {
                        label: "Dataset",
                        value: `${stats.total} records · bundled JSON`,
                        ok: true,
                      },
                      {
                        label: "Supabase",
                        value: isSupabaseConfigured ? "เชื่อมต่อแล้ว" : "ยังไม่ได้ตั้งค่า",
                        ok: isSupabaseConfigured,
                      },
                      {
                        label: "Auth",
                        value: "Local demo (ไม่ปลอดภัย)",
                        ok: false,
                      },
                      {
                        label: "Photos",
                        value: "Wikimedia hotlink + attribution",
                        ok: true,
                      },
                      {
                        label: "Admin writes",
                        value: "Local overrides เท่านั้น",
                        ok: false,
                      },
                    ].map((item) => (
                      <li key={item.label} className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <p className="font-sans text-xs text-concrete">{item.label}</p>
                          <p className="mt-0.5 font-mono text-xs tracking-[0.1em] text-concrete">{item.value}</p>
                        </div>
                        {item.ok ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-acid" aria-label="พร้อมใช้งาน" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-burnt" aria-label="ยังไม่พร้อม" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="clay-panel p-5">
                <div className="flex items-center justify-between">
                  <p className="label-mono text-concrete">LICENSE BREAKDOWN</p>
                  <span className="font-mono text-xs text-concrete">{datasetMeta.verified_photos} PHOTOS</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {Object.entries(datasetMeta.license_breakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([license, count]) => (
                      <div key={license} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate font-sans text-xs text-concrete">{license}</span>
                        <div className="h-1.5 flex-1 bg-paper/10">
                          <div
                            className="h-full bg-acid/80"
                            style={{ width: `${(count / datasetMeta.verified_photos) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-xs text-concrete">{count}</span>
                      </div>
                    ))}
                </div>
              </section>

              <section className="clay-panel p-5">
                <div className="flex items-center justify-between">
                  <p className="label-mono text-concrete">REJECTION REASONS</p>
                  <span className="font-mono text-xs text-concrete">{reportJson.counts.rejected} SEEDS</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {rejectionSummary.map(([reason, count]) => (
                    <li
                      key={reason}
                      className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0"
                    >
                      <span className="font-mono text-xs tracking-[0.08em] text-concrete">{reason}</span>
                      <span className="font-display text-lg font-extrabold text-burnt">{count}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-sans text-xs leading-relaxed text-concrete">
                  เราไม่เติมข้อมูลแทนสถานที่ที่หาไม่พบ — เก็บเป็นรายการปฏิเสธพร้อมเหตุผลเพื่อให้ตรวจซ้ำด้วยมือได้
                </p>
              </section>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-line pt-6">
              <Button
                variant="outline"
                onClick={() =>
                  downloadJson(`framehunt-locations-${new Date().toISOString().slice(0, 10)}.json`, allRecords())
                }
              >
                <Download className="h-3.5 w-3.5" /> Export locations JSON
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  downloadJson(`framehunt-submissions-${new Date().toISOString().slice(0, 10)}.json`, store.submissions)
                }
              >
                <Download className="h-3.5 w-3.5" /> Export submissions
              </Button>
              <Button variant="outline" onClick={() => downloadJson("framehunt-ingest-report.json", reportJson)}>
                <Download className="h-3.5 w-3.5" /> Export ingest report
              </Button>
            </div>
          </div>
        )}

        {/* LOCATIONS */}
        {tab === "locations" && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2 border border-line px-3">
                <Search className="h-4 w-4 text-concrete" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ จังหวัด หรือ slug…"
                  aria-label="ค้นหาโลเคชันในตารางแอดมิน"
                  className="h-10 w-full bg-transparent font-sans text-sm text-paper placeholder:text-concrete focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-auto min-w-40"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="published">เผยแพร่แล้ว</option>
                  <option value="draft">ฉบับร่าง</option>
                </Select>
                <span className="font-mono text-xs text-concrete">{filteredLocations.length} ROWS</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[56rem] text-left">
                <thead>
                  <tr className="border-b border-line bg-ink-2">
                    <th className="label-mono px-4 py-3 text-concrete">LOCATION</th>
                    <th className="label-mono px-4 py-3 text-concrete">PROVINCE</th>
                    <th className="label-mono px-4 py-3 text-concrete">PHOTO GATE</th>
                    <th className="label-mono px-4 py-3 text-concrete">COORDS</th>
                    <th className="label-mono px-4 py-3 text-concrete">STATUS</th>
                    <th className="label-mono px-4 py-3 text-concrete">OVERRIDE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLocations.map((loc) => {
                    const gate = photoGate(loc);
                    const override = store.adminOverrides[loc.id];
                    return (
                      <tr key={loc.id} className="border-b border-line last:border-0 hover:bg-ink-2/60">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => openLocation(loc)} className="text-left">
                            <p className="font-sans text-sm font-medium text-paper/85 hover:text-acid">{loc.name_th}</p>
                            <p className="font-mono text-xs tracking-[0.08em] text-concrete">{loc.slug}</p>
                          </button>
                        </td>
                        <td className="px-4 py-3 font-sans text-xs text-concrete">{loc.province_th}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-mono text-xs", gate.passes ? "text-acid" : "text-burnt")}>
                              {gate.verified}/{gate.required}
                            </span>
                            <div className="h-1 w-14 bg-paper/10">
                              <div
                                className={cn("h-full", gate.passes ? "bg-acid" : "bg-burnt")}
                                style={{ width: `${Math.min(100, (gate.verified / gate.required) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-concrete">
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={gate.passes ? "acid" : "burnt"}>{gate.passes ? "PUBLISHED" : "DRAFT"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {override?.status ? (
                            <span className="font-mono text-xs text-burnt">{override.status} (local)</span>
                          ) : (
                            <span className="font-mono text-xs text-paper/20">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredLocations.length && (
                <div className="p-10 text-center">
                  <p className="font-sans text-sm text-concrete">ไม่พบรายการที่ตรงกับตัวกรอง</p>
                </div>
              )}
            </div>

            <p className="font-sans text-xs leading-relaxed text-concrete">
              ตารางนี้แสดงสถานะจริงจากชุดข้อมูล — “OVERRIDE” คือการเปลี่ยนสถานะในเครื่องนี้เพื่อทดสอบ workflow ไม่มีผลต่อการเผยแพร่จริง
              และไม่สามารถข้ามเกณฑ์ภาพ 5 ภาพได้
            </p>
          </div>
        )}

        {/* SUBMISSIONS */}
        {tab === "submissions" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-mono text-concrete">COMMUNITY SUBMISSIONS</p>
                <p className="mt-1 font-sans text-xs text-concrete">
                  {store.submissions.length} รายการ · เก็บในเครื่องนี้เท่านั้นเมื่อไม่ได้เชื่อมต่อ Supabase
                </p>
              </div>
              <Select
                value={subFilter}
                onChange={(e) => setSubFilter(e.target.value as typeof subFilter)}
                className="w-auto min-w-40"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอตรวจ</option>
                <option value="reviewing">กำลังตรวจ</option>
                <option value="accepted">รับเข้าคิว</option>
                <option value="rejected">ปฏิเสธ</option>
              </Select>
            </div>

            {!filteredSubs.length ? (
              <div className="border border-line p-12 text-center">
                <Inbox className="mx-auto h-8 w-8 text-paper/15" />
                <p className="mt-4 font-display text-xl font-extrabold text-concrete">NO SUBMISSIONS</p>
                <p className="mt-2 font-sans text-xs text-concrete">ยังไม่มีคำขอในสถานะนี้</p>
                <Link
                  to="/submit"
                  className="mt-5 inline-flex items-center gap-1 font-mono text-xs tracking-normal text-acid hover:underline"
                >
                  เปิดฟอร์มเสนอสถานที่ <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="space-y-px bg-line">
                {filteredSubs.map((sub) => (
                  <SubmissionRow
                    key={sub.id}
                    submission={sub}
                    onStatus={(status) => submissionStore.setStatus(sub.id, status)}
                    onDelete={() => submissionStore.remove(sub.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTS */}
        {tab === "reports" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-mono text-concrete">CONTENT REPORTS</p>
                <p className="mt-1 font-sans text-xs text-concrete">
                  รายงานจากปุ่ม “Report” ในหน้ารายละเอียด — {reports.filter((r) => r.status === "open").length}{" "}
                  รายการยังเปิดอยู่
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={reportFilter}
                  onChange={(e) => setReportFilter(e.target.value as typeof reportFilter)}
                  className="w-auto min-w-36"
                >
                  <option value="all"> <Localized text="ทั้งหมด" /> </option>
                  <option value="open">เปิดอยู่</option>
                  <option value="resolved">แก้ไขแล้ว</option>
                  <option value="dismissed">ไม่ใช่ปัญหา</option>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setReports(readReports())}>
                  <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
                </Button>
              </div>
            </div>

            {!filteredReports.length ? (
              <div className="border border-line p-12 text-center">
                <Flag className="mx-auto h-8 w-8 text-paper/15" />
                <p className="mt-4 font-display text-xl font-extrabold text-concrete">NO REPORTS</p>
                <p className="mt-2 font-sans text-xs text-concrete">ยังไม่มีรายงานข้อมูลผิดในเครื่องนี้</p>
              </div>
            ) : (
              <div className="space-y-px bg-line">
                {filteredReports.map((report) => (
                  <div key={report.id} className="bg-ink p-4 md:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={report.status === "open" ? "burnt" : "acid"}>
                            {report.status.toUpperCase()}
                          </Badge>
                          <span className="font-mono text-xs tracking-[0.1em] text-concrete">
                            {formatThaiDate(report.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 font-sans text-sm text-paper/75">{report.reason}</p>
                        <Link
                          to={`/locations/${report.locationSlug}`}
                          className="mt-1 inline-flex items-center gap-1 font-mono text-xs tracking-[0.1em] text-acid hover:underline"
                        >
                          /locations/{report.locationSlug} <ArrowUpRight className="h-3 w-3" />
                        </Link>
                        {report.detail && (
                          <p className="mt-2 max-w-2xl font-sans text-xs leading-relaxed text-concrete">
                            {report.detail}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {report.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              persistReports(
                                reports.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r)),
                              )
                            }
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> แก้ไขแล้ว
                          </Button>
                        )}
                        {report.status !== "dismissed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              persistReports(
                                reports.map((r) => (r.id === report.id ? { ...r, status: "dismissed" } : r)),
                              )
                            }
                          >
                            ไม่ใช่ปัญหา
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="ลบรายงาน"
                          onClick={() => persistReports(reports.filter((r) => r.id !== report.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-burnt" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="font-sans text-xs leading-relaxed text-concrete">
              สถานะรายงานถูกเก็บใน localStorage ของเบราว์เซอร์นี้ — ใน production ต้องย้ายไปตาราง{" "}
              <code className="font-mono">content_reports</code> พร้อม RLS
            </p>
          </div>
        )}

        {/* DATA QUALITY */}
        {tab === "data" && (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="border border-line">
                <div className="border-b border-line bg-ink-2 px-4 py-3">
                  <p className="label-mono text-concrete">
                    DRAFTS AWAITING PHOTOS ({reportJson.drafts_awaiting_photos.length})
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {reportJson.drafts_awaiting_photos.map((draft) => (
                    <li key={draft.slug} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="font-sans text-sm text-paper/75">{draft.name}</p>
                        <p className="font-mono text-xs tracking-[0.1em] text-concrete">{draft.province}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs text-burnt">
                          {draft.verified_photos}/{draft.needed}
                        </p>
                        <p className="font-mono text-xs text-concrete">PHOTOS</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="border border-line">
                <div className="border-b border-line bg-ink-2 px-4 py-3">
                  <p className="label-mono text-concrete">PHOTO REJECTIONS ({reportJson.photo_rejections.length})</p>
                </div>
                <ul className="divide-y divide-line">
                  {photoRejectionSummary.map(([reason, count]) => (
                    <li key={reason} className="flex items-center justify-between px-4 py-3">
                      <span className="font-mono text-xs tracking-[0.08em] text-concrete">{reason}</span>
                      <span className="font-display text-lg font-extrabold text-burnt">{count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="border border-line">
              <div className="border-b border-line bg-ink-2 px-4 py-3">
                <p className="label-mono text-concrete">REJECTED SEEDS ({reportJson.rejections.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="label-mono px-4 py-2.5 text-concrete">SEED</th>
                      <th className="label-mono px-4 py-2.5 text-concrete">PROVINCE</th>
                      <th className="label-mono px-4 py-2.5 text-concrete">REASON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportJson.rejections.map((rejection) => (
                      <tr
                        key={`${rejection.seed}-${rejection.province}`}
                        className="border-b border-line last:border-0"
                      >
                        <td className="px-4 py-2.5 font-sans text-xs text-concrete">{rejection.seed}</td>
                        <td className="px-4 py-2.5 font-sans text-xs text-concrete">{rejection.province}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-burnt/80">{rejection.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="clay-panel p-5">
              <div className="flex items-start gap-3">
                <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-burnt" aria-hidden />
                <div>
                  <p className="font-display text-lg font-extrabold ">ข้อจำกัดของชุดข้อมูล</p>
                  <ul className="mt-3 space-y-2 font-sans text-xs leading-relaxed text-concrete">
                    <li>• พิกัดและคำอธิบายมาจาก Wikidata/วิกิพีเดีย ไม่ได้สำรวจภาคสนามทุกจุด</li>
                    <li>• สถานะการขออนุญาตถ่ายทำยังเป็น “ไม่ยืนยัน” สำหรับทุกรายการ เว้นแต่มีแหล่งชัดเจน</li>
                    <li>• ภาพเป็น hotlink จาก Wikimedia Commons — ถ้าต้นทางลบภาพ การแสดงผลอาจเสีย</li>
                    <li>• ยังไม่ครอบคลุม 77 จังหวัด และยังไม่มีข้อมูลค่าธรรมเนียม/crew/parking ที่ยืนยันแล้ว</li>
                  </ul>
                  <Link
                    to="/about"
                    className="mt-4 inline-flex items-center gap-1 font-mono text-xs tracking-normal text-acid hover:underline"
                  >
                    อ่านนโยบายข้อมูลฉบับเต็ม <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Location dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <>
              <div className="flex items-start gap-4">
                {selected.photos[0] && (
                  <img
                    src={selected.photos[0].thumb_url}
                    alt={selected.name_th}
                    className="hidden h-20 w-28 object-cover sm:block"
                    loading="lazy"
                  />
                )}
                <div>
                  <p className="label-mono text-acid">
                    {selected.province_th} · ZONE {selected.zone}
                  </p>
                  <DialogTitle className="display mt-1 text-3xl">{selected.name_th}</DialogTitle>
                  <p className="font-sans text-xs text-concrete">{selected.name_en}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="border border-line p-3">
                  <p className="label-mono text-concrete">PHOTO GATE</p>
                  <p
                    className={cn(
                      "mt-2 font-display text-2xl font-extrabold",
                      photoGate(selected).passes ? "text-acid" : "text-burnt",
                    )}
                  >
                    {photoGate(selected).verified}/{photoGate(selected).required}
                  </p>
                </div>
                <div className="border border-line p-3">
                  <p className="label-mono text-concrete">COORDINATES</p>
                  <p className="mt-2 font-mono text-xs text-concrete">
                    {selected.latitude.toFixed(5)}
                    <br />
                    {selected.longitude.toFixed(5)}
                  </p>
                </div>
                <div className="border border-line p-3">
                  <p className="label-mono text-concrete">PERMISSION</p>
                  <p className="mt-2 font-sans text-xs text-concrete">{selected.permission.permission_status}</p>
                </div>
              </div>

              <div className="mt-4 border border-line p-3">
                <p className="label-mono text-concrete">SOURCE</p>
                <a
                  href={selected.sources[0]?.source_url ?? selected.coordinate_source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 break-all font-sans text-xs text-acid hover:underline"
                >
                  {selected.sources[0]?.source_url ?? selected.coordinate_source.url}
                  <ArrowUpRight className="h-3 w-3 shrink-0" />
                </a>
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="label-mono text-burnt">LOCAL OVERRIDE (ไม่บันทึกขึ้นเซิร์ฟเวอร์)</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="override-status">สถานะที่ต้องการ</Label>
                    <Select
                      id="override-status"
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                    >
                      <option value="published">published</option>
                      <option value="draft">draft</option>
                      <option value="archived">archived</option>
                      <option value="rejected">rejected</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="override-note">หมายเหตุภายใน</Label>
                    <Input
                      id="override-note"
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      placeholder="เหตุผลในการเปลี่ยนสถานะ"
                    />
                  </div>
                </div>
                <p className="mt-2 font-sans text-xs leading-relaxed text-concrete">
                  การ override ไม่สามารถข้ามเกณฑ์ภาพ {datasetMeta.min_photos_required} ภาพ หรือพิกัดที่ยืนยันแล้วได้
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {store.adminOverrides[selected.id] && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        adminStore.clearOverride(selected.id);
                        setSelected(null);
                      }}
                    >
                      ล้าง override
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    ยกเลิก
                  </Button>
                  <Button onClick={saveOverride}>บันทึกในเครื่องนี้</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubmissionRow({
  submission,
  onStatus,
  onDelete,
}: {
  submission: Submission;
  onStatus: (status: SubmissionStatus) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-ink p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={STATUS_STYLE[submission.status]}>{STATUS_LABEL[submission.status]}</Badge>
            <Badge variant="ink">{submission.type}</Badge>
            <span className="font-mono text-xs tracking-[0.1em] text-concrete">
              {formatThaiDate(submission.createdAt)}
            </span>
          </div>
          <p className="mt-2 font-sans text-sm font-medium text-paper/85">{submission.name}</p>
          <p className="font-mono text-xs tracking-[0.1em] text-concrete">
            {submission.province} · {submission.submitterEmail || "ไม่ระบุอีเมล"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {open ? "ย่อ" : "รายละเอียด"}
          </Button>
          <Select
            value={submission.status}
            onChange={(e) => onStatus(e.target.value as SubmissionStatus)}
            className="h-8 w-auto px-2 text-xs"
            aria-label="เปลี่ยนสถานะคำขอ"
          >
            <option value="pending">รอตรวจ</option>
            <option value="reviewing">กำลังตรวจ</option>
            <option value="accepted">รับเข้าคิว</option>
            <option value="rejected">ปฏิเสธ</option>
          </Select>
          <Button size="sm" variant="ghost" aria-label="ลบคำขอ" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 text-burnt" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
          <div>
            <p className="label-mono text-concrete">DESCRIPTION</p>
            <p className="mt-1 font-sans text-xs leading-relaxed text-concrete">{submission.description}</p>
            {submission.coordinates && (
              <p className="mt-3 font-mono text-xs text-concrete">COORDS {submission.coordinates}</p>
            )}
            {submission.sourceUrl && (
              <a
                href={submission.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 break-all font-sans text-xs text-acid hover:underline"
              >
                {submission.sourceUrl} <ArrowUpRight className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
          <div>
            {submission.photoNote && (
              <>
                <p className="label-mono text-concrete">PHOTO SOURCES</p>
                <p className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-concrete">
                  {submission.photoNote}
                </p>
              </>
            )}
            {submission.permissionNote && (
              <>
                <p className="label-mono mt-3 text-concrete">PERMISSION NOTES</p>
                <p className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-concrete">
                  {submission.permissionNote}
                </p>
              </>
            )}
            {submission.contact && <p className="mt-3 font-sans text-xs text-concrete">ติดต่อ: {submission.contact}</p>}
            <p className="mt-4 border border-burnt/30 bg-burnt/5 p-2 font-sans text-xs leading-relaxed text-concrete">
              “รับเข้าคิว” ไม่ได้เผยแพร่สถานที่อัตโนมัติ — ต้องรัน ingest และผ่านเกณฑ์ภาพ ≥5 ภาพก่อน
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Label } from "@/components/ui";
import type { LocationRecord, LocationStatus } from "@/data/types";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/services/auth";
import { publicCatalogKey } from "@/services/catalogContext";
import { loadRemoteCatalog } from "@/services/catalogRemote";
import { isPublishable, photoGate } from "@/services/locations";
import { ModerationQueue } from "@/components/location/ModerationQueue";

const statuses: Record<LocationStatus, string> = {
  draft: "ฉบับร่าง",
  published: "เผยแพร่",
  archived: "เก็บถาวร",
  rejected: "ปฏิเสธ",
};

export function HostedAdmin() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"locations" | "submissions" | "reports">("locations");
  const adminKey = ["catalog", "admin", user?.id] as const;
  const catalog = useQuery({
    queryKey: adminKey,
    queryFn: ({ signal }) => loadRemoteCatalog(supabase!, signal, false),
    staleTime: 0,
    gcTime: 0,
    enabled: tab === "locations",
  });
  const changeStatus = useMutation({
    mutationFn: async ({ location, status }: { location: LocationRecord; status: LocationStatus }) => {
      const { data, error } = await supabase!
        .from("locations")
        .update({ status })
        .eq("id", location.id)
        .eq("status", location.status)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("รายการถูกแก้ไขระหว่างที่เปิดหน้านี้");
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKey }),
        queryClient.invalidateQueries({ queryKey: publicCatalogKey }),
      ]);
    },
  });

  const records = catalog.data?.allRecords() ?? [];
  const search = filter.trim().toLowerCase();
  const visible = records.filter((loc) =>
    `${loc.name_th} ${loc.name_en} ${loc.province_th}`.toLowerCase().includes(search),
  );
  const waitingForPhotos = records.filter((loc) => loc.status === "draft" && photoGate(loc).missing > 0).length;

  return (
    <div className="container-x py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="display text-4xl">ADMIN CONTROL</h1>
          <p className="mt-2 text-sm text-concrete">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          ออกจากระบบ
        </Button>
      </div>
      <nav aria-label="งานแอดมิน" className="mt-5 flex flex-wrap gap-2">
        <Button
          variant={tab === "locations" ? "primary" : "outline"}
          aria-pressed={tab === "locations"}
          onClick={() => setTab("locations")}
        >
          โลเคชัน
        </Button>
        <Button
          variant={tab === "submissions" ? "primary" : "outline"}
          aria-pressed={tab === "submissions"}
          onClick={() => setTab("submissions")}
        >
          ข้อเสนอ
        </Button>
        <Button
          variant={tab === "reports" ? "primary" : "outline"}
          aria-pressed={tab === "reports"}
          onClick={() => setTab("reports")}
        >
          รายงาน
        </Button>
      </nav>
      {tab !== "locations" ? (
        <ModerationQueue key={tab} kind={tab} />
      ) : (
        <>
          {catalog.isPending && (
            <p className="mt-6" role="status">
              กำลังโหลดรายการ…
            </p>
          )}
          {catalog.isError && (
            <div className="mt-6 flex items-center gap-4">
              <p role="alert">โหลดรายการจากฐานข้อมูลไม่สำเร็จ</p>
              <Button variant="outline" onClick={() => void catalog.refetch()}>
                ลองอีกครั้ง
              </Button>
            </div>
          )}
          {catalog.data && (
            <>
              <p className="my-5 text-concrete">
                {catalog.data.publishedLocations().length} เผยแพร่ ·{" "}
                {records.filter((loc) => loc.status === "draft").length} ฉบับร่าง · {waitingForPhotos} รอภาพเพิ่ม
              </p>
              <div className="mb-5 max-w-md">
                <Label htmlFor="catalog-filter">ค้นหาชื่อสถานที่หรือจังหวัด</Label>
                <Input id="catalog-filter" value={filter} onChange={(event) => setFilter(event.target.value)} />
              </div>
              <div className="mb-3 min-h-6" aria-live="polite">
                {changeStatus.isSuccess && <p className="text-acid">บันทึกสถานะแล้ว</p>}
                {changeStatus.isError && (
                  <p role="alert" className="text-burnt">
                    บันทึกสถานะไม่สำเร็จ โปรดตรวจสิทธิ์และข้อมูลล่าสุด
                  </p>
                )}
              </div>
              {visible.length === 0 && <p className="text-concrete">ไม่พบโลเคชัน</p>}
              <ul className="divide-y divide-line border-y border-line">
                {visible.map((location) => {
                  const { verified, required } = photoGate(location);
                  const canPublish = isPublishable({ ...location, status: "published" });
                  return (
                    <li key={location.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div>
                        <h2 className="font-bold">{location.name_th}</h2>
                        <p className="text-sm text-concrete">
                          {location.province_th} · {statuses[location.status]} · {verified}/{required} ภาพที่ผ่านเกณฑ์
                        </p>
                        {location.status !== "published" && !canPublish && (
                          <p className="text-sm text-burnt">ตรวจภาพที่ยืนยันแล้ว พิกัด และแหล่งอ้างอิงก่อนเผยแพร่</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["published", "draft", "archived"] as const)
                          .filter((status) => status !== location.status)
                          .map((status) => (
                            <Button
                              key={status}
                              variant={status === "published" ? "primary" : "outline"}
                              size="sm"
                              disabled={changeStatus.isPending || (status === "published" && !canPublish)}
                              onClick={() => changeStatus.mutate({ location, status })}
                            >
                              {status === "draft" ? "ย้ายเป็นฉบับร่าง" : statuses[status]}
                            </Button>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

import { Localized } from "@/i18n/Language";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { safeExternalUrl } from "@/lib/utils";
import { useAuth } from "@/services/auth";

const queues = {
  submissions: {
    table: "location_submissions",
    status: "pending",
    select: "id,title:name,detail:description,source:source_url,context:province,created_at",
    actions: { accepted: "รับข้อเสนอ", rejected: "ปฏิเสธ" },
  },
  reports: {
    table: "content_reports",
    status: "open",
    select: "id,title:reason,detail,context:location_slug,created_at",
    actions: { resolved: "แก้ไขแล้ว", dismissed: "ปิดรายงาน" },
  },
} as const;

interface QueueItem {
  id: string;
  title: string;
  detail: string;
  source?: string | null;
  context: string;
  created_at: string;
}

export function ModerationQueue({ kind }: { kind: keyof typeof queues }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const config = queues[kind];
  const queryKey = ["admin-moderation", user?.id, kind];
  const queue = useQuery({
    queryKey,
    staleTime: 0,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase!
        .from(config.table)
        .select(config.select)
        .eq("status", config.status)
        .order("created_at")
        .order("id")
        .limit(50)
        .abortSignal(signal)
        .overrideTypes<QueueItem[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const now = new Date().toISOString();
      const audit =
        kind === "submissions"
          ? { reviewed_by: user!.id, reviewed_at: now }
          : { resolved_by: user!.id, resolved_at: now };
      const { data, error } = await supabase!
        .from(config.table)
        .update({ status, ...audit })
        .eq("id", id)
        .eq("status", config.status)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("สถานะรายการมีการเปลี่ยนแปลง");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (queue.isPending)
    return (
      <p className="py-6" role="status">
        <Localized text={"กำลังโหลดคิว…"} /></p>
    );
  if (queue.isError) {
    return (
      <div className="flex items-center gap-4 py-6">
        <p role="alert"><Localized text={"โหลดคิวตรวจสอบไม่สำเร็จ"} /></p>
        <Button variant="outline" onClick={() => void queue.refetch()}>
          <Localized text={"ลองอีกครั้ง"} /></Button>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 min-h-6" aria-live="polite">
        {review.isSuccess && <p className="text-acid"><Localized text={"บันทึกผลตรวจสอบแล้ว"} /></p>}
        {review.isError && (
          <p role="alert" className="text-burnt">
            <Localized text={"บันทึกผลตรวจสอบไม่สำเร็จ"} /></p>
        )}
      </div>
      {queue.data.length === 0 && <p className="py-4 text-concrete"><Localized text={"ไม่มีรายการที่รอตรวจสอบ"} /></p>}
      <ul className="divide-y divide-line border-y border-line">
        {queue.data.map((item) => {
          const source = safeExternalUrl(item.source);
          return (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
              <div className="min-w-0 flex-1 break-words">
                <h2 className="font-bold">{item.title}</h2>
                <p className="text-sm text-concrete">
                  {item.context} · {new Date(item.created_at).toLocaleDateString("th-TH")}
                </p>
                {item.detail && <p className="mt-2 whitespace-pre-wrap text-sm">{item.detail}</p>}
                {source && (
                  <a className="text-sm text-acid underline" href={source} target="_blank" rel="noreferrer">
                    <Localized text={"แหล่งอ้างอิง"} /></a>
                )}
                {kind === "reports" && (
                  <Link className="text-sm text-acid underline" to={`/locations/${encodeURIComponent(item.context)}`}>
                    <Localized text={"ดูโลเคชัน"} /></Link>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(config.actions).map(([status, label]) => (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: item.id, status })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

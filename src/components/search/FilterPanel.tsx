import { useId, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { SearchFilters } from "@/data/types";
import { emptyFilters } from "@/data/types";
import { GROUP_META, categories, moods, provinces } from "@/data/taxonomy";
import { Button, Dialog, DialogContent, DialogTitle, Label, Select, Switch } from "@/components/ui";
import { cn } from "@/lib/utils";

interface Props {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onReset: () => void;
  resultCount: number;
  variant?: "sidebar" | "sheet";
}

const PERMISSIONS = [
  { value: "", label: "ทั้งหมด" },
  { value: "allowed", label: "อนุญาตแล้ว" },
  { value: "needs_permission", label: "ต้องขออนุญาต" },
  { value: "unknown", label: "ยังไม่ยืนยัน" },
  { value: "restricted", label: "ไม่อนุญาต" },
];

export function FilterFields({ filters, onChange, onReset }: Props) {
  const fieldId = useId();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    urban: true,
    art: false,
    nature: false,
    historical: false,
  });

  const grouped = (["urban", "art", "nature", "historical"] as const).map((g) => ({
    group: g,
    meta: GROUP_META[g],
    items: categories.filter((c) => c.group === g),
  }));

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <p className="label-mono text-concrete">ตัวกรอง</p>
        <button
          type="button"
          onClick={onReset}
          className="label-mono text-concrete underline decoration-paper/20 underline-offset-4 hover:text-acid"
        >
          ล้างทั้งหมด
        </button>
      </div>

      <div>
        <Label htmlFor={`${fieldId}-province`}>จังหวัด</Label>
        <Select
          id={`${fieldId}-province`}
          value={filters.province}
          onChange={(e) => onChange({ province: e.target.value })}
        >
          <option value="">ทุกจังหวัด</option>
          {provinces.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name_th} — {p.name_en}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>ประเภทสถานที่</Label>
        <div className="space-y-2">
          {grouped.map(({ group, meta, items }) => {
            const selectedCount = items.filter((c) => filters.categories.includes(c.slug)).length;
            return (
              <div key={group} className="border border-line">
                <button
                  type="button"
                  onClick={() => setOpenGroups((s) => ({ ...s, [group]: !s[group] }))}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                  aria-expanded={openGroups[group]}
                >
                  <span className="flex items-center gap-2 font-sans text-xs text-paper/80">
                    <span className="h-2 w-2" style={{ background: meta.color }} />
                    {meta.name_th}
                    {selectedCount > 0 && <span className="font-mono text-xs text-acid">({selectedCount})</span>}
                  </span>
                  <span className="font-mono text-xs text-concrete">{openGroups[group] ? "−" : "+"}</span>
                </button>
                {openGroups[group] && (
                  <div className="grid grid-cols-2 gap-1 border-t border-line p-2">
                    {items.map((c) => {
                      const checked = filters.categories.includes(c.slug);
                      return (
                        <label
                          key={c.slug}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 px-2 py-1.5 font-sans text-xs transition-colors",
                            checked ? "bg-acid/10 text-acid" : "text-concrete hover:text-paper",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              onChange({
                                categories: checked
                                  ? filters.categories.filter((s) => s !== c.slug)
                                  : [...filters.categories, c.slug],
                              })
                            }
                            className="h-3 w-3 accent-acid"
                          />
                          <span className="truncate">{c.name_th}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Mood</Label>
        <div className="flex flex-wrap gap-1.5">
          {moods.map((m) => {
            const checked = filters.moods.includes(m.slug);
            return (
              <button
                key={m.slug}
                type="button"
                aria-pressed={checked}
                onClick={() =>
                  onChange({
                    moods: checked ? filters.moods.filter((s) => s !== m.slug) : [...filters.moods, m.slug],
                  })
                }
                className={cn(
                  "border px-2 py-1.5 font-mono text-xs tracking-normal transition-colors",
                  checked
                    ? "border-acid bg-acid text-ink"
                    : "border-paper/20 text-concrete hover:border-paper/50 hover:text-paper",
                )}
              >
                {m.name_en}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor={`${fieldId}-permission`}>สถานะการอนุญาต</Label>
        <Select
          id={`${fieldId}-permission`}
          value={filters.permission}
          onChange={(e) => onChange({ permission: e.target.value })}
        >
          {PERMISSIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
        <p className="mt-2 font-sans text-xs leading-relaxed text-concrete">
          ข้อมูลส่วนใหญ่ยังไม่ผ่านการยืนยันจากหน่วยงาน — ระบบจะไม่ถือว่าสถานที่ที่เปิดให้ท่องเที่ยวอนุญาตถ่ายทำเชิงพาณิชย์โดยอัตโนมัติ
        </p>
      </div>

      <div className="space-y-3 border-t border-line pt-5">
        <Switch
          checked={filters.withPhotosOnly}
          onCheckedChange={(v) => onChange({ withPhotosOnly: v })}
          label="เฉพาะที่มีภาพครบ 5 ภาพ"
        />
        <Switch
          checked={filters.verifiedOnly}
          onCheckedChange={(v) => onChange({ verifiedOnly: v })}
          label="เฉพาะพิกัดที่ยืนยันแล้ว"
        />
      </div>

      <div>
        <Label htmlFor={`${fieldId}-sort`}>เรียงตาม</Label>
        <Select
          id={`${fieldId}-sort`}
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as SearchFilters["sort"] })}
        >
          <option value="relevance">ความเกี่ยวข้อง</option>
          <option value="recent">เพิ่มล่าสุด / ตรวจสอบล่าสุด</option>
          <option value="photos">จำนวนภาพ</option>
          <option value="distance">ระยะทาง (ต้องเปิดตำแหน่ง)</option>
        </Select>
      </div>

      <div className="border border-line bg-paper/[0.02] p-3">
        <p className="label-mono mb-1 text-concrete">NEED A STARTING POINT?</p>
        <p className="font-sans text-xs leading-relaxed text-concrete">
          ลองค้นว่า “โกดังเก่า”, “ถ้ำ”, “Gothic” หรือเลือกจังหวัดแล้วกดดูผลลัพธ์
        </p>
      </div>
    </div>
  );
}

export function FilterSidebar(props: Props) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="glass-panel sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-4">
        <FilterFields {...props} />
      </div>
    </aside>
  );
}

export function FilterSheet(props: Props & { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="bottom-0 left-0 top-auto max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 rounded-b-none border-x-0 border-b-0 p-5 md:p-7"
      >
        <DialogTitle className="display mb-5 text-2xl">ตัวกรอง</DialogTitle>
        <FilterFields {...props} />
        <div className="sticky bottom-0 -mx-5 mt-6 border-t border-line bg-ink px-5 py-4 md:-mx-7 md:px-7">
          <Button className="w-full" onClick={() => props.onOpenChange(false)}>
            ดูผลลัพธ์ {props.resultCount} สถานที่
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ActiveFilterChips({
  filters,
  onChange,
  onReset,
}: {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  onReset: () => void;
}) {
  const chips: { label: string; clear: () => void }[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, clear: () => onChange({ q: "" }) });
  if (filters.province) {
    const p = provinces.find((x) => x.slug === filters.province);
    chips.push({ label: p?.name_th ?? filters.province, clear: () => onChange({ province: "" }) });
  }
  for (const c of filters.categories) {
    const cat = categories.find((x) => x.slug === c);
    chips.push({
      label: cat?.name_th ?? c,
      clear: () => onChange({ categories: filters.categories.filter((s) => s !== c) }),
    });
  }
  for (const m of filters.moods) {
    const mood = moods.find((x) => x.slug === m);
    chips.push({
      label: mood?.name_en ?? m,
      clear: () => onChange({ moods: filters.moods.filter((s) => s !== m) }),
    });
  }
  if (filters.permission) {
    chips.push({
      label: PERMISSIONS.find((p) => p.value === filters.permission)?.label ?? filters.permission,
      clear: () => onChange({ permission: "" }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.clear}
          className="flex items-center gap-1.5 border border-acid/40 bg-acid/5 px-2 py-1 font-sans text-xs text-acid"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="font-mono text-xs tracking-normal text-concrete hover:text-paper"
      >
        ล้างทั้งหมด
      </button>
    </div>
  );
}

export function MobileFilterButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center gap-2 clay-control border border-white bg-ink/85 px-4 font-mono text-xs tracking-normal text-concrete lg:hidden"
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      ตัวกรอง
      {count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center bg-acid px-1 text-xs text-ink">{count}</span>
      )}
    </button>
  );
}

export { emptyFilters };

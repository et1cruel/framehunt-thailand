import { Localized, useLanguage } from "@/i18n/Language";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  Clipboard,
  Download,
  FileText,
  Heart,
  Link2,
  Plus,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useLocationCatalog } from "@/services/catalogContext";
import { boards as boardStore, useBoards, useFavorites, useStore } from "@/services/localStore";
import { LocationCard, PhotoImage } from "@/components/location/LocationCard";
import { Button, Dialog, DialogContent, DialogTitle, Input, Label, Textarea } from "@/components/ui";
import { useSeo } from "@/lib/useSeo";
import { cn, decodeBoardShare, downloadJson, encodeBoardShare } from "@/lib/utils";
import type { Board, BoardItem } from "@/data/types";

interface SharedBoard {
  title: string;
  description?: string;
  items: { slug: string; notes?: string; priority?: 1 | 2 | 3 }[];
}

const PRIORITY_LABEL: Record<number, string> = { 1: "MUST", 2: "MAYBE", 3: "BACKUP" };

function BoardCard({ board, onOpen }: { board: Board; onOpen: () => void }) {
  const { publishedLocations } = useLocationCatalog();
  const cover = publishedLocations().find((l) => l.id === board.coverLocationId);
  const photo = cover?.photos.find((p) => p.is_cover) ?? cover?.photos[0];
  const firstWithPhoto = board.items
    .map((i) => publishedLocations().find((l) => l.id === i.locationId))
    .find((l) => l?.photos.length);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col border border-line text-left transition-colors hover:border-paper/40"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-ink-2">
        {photo || firstWithPhoto ? (
          <PhotoImage
            photo={photo ?? firstWithPhoto?.photos[0]}
            fallbackPhotos={cover?.photos ?? firstWithPhoto?.photos}
            galleryAssetUrl={cover?.gallery_asset_url ?? firstWithPhoto?.gallery_asset_url}
            expectedPhotoCount={cover?.photo_count ?? firstWithPhoto?.photo_count}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="h-full w-full object-cover frame-img"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-8 w-8 text-paper/15" />
          </div>
        )}
        <span className="absolute left-2 top-2 bg-ink/80 px-2 py-1 font-mono text-xs tracking-normal text-acid">
          {board.items.length} LOCATIONS
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <h3 className="font-display text-xl font-extrabold leading-tight group-hover:text-acid">{board.title}</h3>
          {board.description && (
            <p className="mt-1 line-clamp-2 font-sans text-xs text-concrete">{board.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs tracking-normal text-concrete">
            {new Date(board.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-concrete group-hover:text-acid" />
        </div>
      </div>
    </button>
  );
}

export default function BoardsPage() {
  const { t, language } = useLanguage();
  const { publishedLocations } = useLocationCatalog();
  const [sp, setSp] = useSearchParams();
  const allBoards = useBoards();
  const store = useStore();
  const { favorites, isFavorite, toggle } = useFavorites();
  const [tab, setTab] = useState<"boards" | "saved">((sp.get("tab") as "boards" | "saved") || "boards");
  const [activeId, setActiveId] = useState<string | null>(sp.get("board"));
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const importRef = useRef(false);

  const active = useMemo(() => allBoards.find((b) => b.id === activeId) ?? null, [allBoards, activeId]);
  const savedLocations = useMemo(
    () => publishedLocations().filter((l) => favorites.includes(l.id)),
    [favorites, publishedLocations],
  );

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  // Import a board from ?share=<payload> once.
  useEffect(() => {
    if (importRef.current) return;
    const payload = sp.get("share");
    if (!payload) return;
    importRef.current = true;
    const data = decodeBoardShare<SharedBoard>(payload);
    if (!data || !Array.isArray(data.items)) {
      flash("ลิงก์บอร์ดไม่ถูกต้องหรือเสียหาย");
      return;
    }
    const board = boardStore.create(`${data.title} (นำเข้า)`, data.description ?? "");
    let added = 0;
    for (const item of data.items) {
      const loc = publishedLocations().find((l) => l.slug === item.slug);
      if (!loc) continue;
      if (boardStore.addItem(board.id, loc.id, item.notes ?? "")) {
        boardStore.updateItem(board.id, loc.id, { priority: item.priority ?? 2 });
        added += 1;
      }
    }
    setActiveId(board.id);
    const params = new URLSearchParams(sp);
    params.delete("share");
    params.set("board", board.id);
    setSp(params, { replace: true });
    flash(`นำเข้าบอร์ดแล้ว ${added} สถานที่`);
  }, [sp, setSp, publishedLocations]);

  function create() {
    if (!title.trim()) return;
    const board = boardStore.create(title.trim(), description.trim());
    setTitle("");
    setDescription("");
    setCreateOpen(false);
    setActiveId(board.id);
    const params = new URLSearchParams(sp);
    params.set("board", board.id);
    params.set("tab", "boards");
    setSp(params, { replace: true });
    flash("สร้างบอร์ดแล้ว");
  }

  function openBoard(id: string) {
    setActiveId(id);
    const params = new URLSearchParams(sp);
    params.set("board", id);
    params.set("tab", "boards");
    setSp(params, { replace: true });
  }

  function closeBoard() {
    setActiveId(null);
    const params = new URLSearchParams(sp);
    params.delete("board");
    setSp(params, { replace: true });
  }

  function shareBoard() {
    if (!active) return;
    const payload: SharedBoard = {
      title: active.title,
      description: active.description,
      items: active.items.flatMap((item) => {
        const loc = publishedLocations().find((l) => l.id === item.locationId);
        return loc ? [{ slug: loc.slug, notes: item.notes, priority: item.priority }] : [];
      }),
    };
    const url = `${window.location.origin}/boards?share=${encodeBoardShare(payload)}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      })
      .catch(() => flash("คัดลอกลิงก์ไม่สำเร็จ"));
  }

  function exportBoard() {
    if (!active) return;
    const rows = active.items.map((item) => {
      const loc = publishedLocations().find((l) => l.id === item.locationId);
      return {
        name_th: loc?.name_th ?? null,
        name_en: loc?.name_en ?? null,
        slug: loc?.slug ?? null,
        province: loc?.province_th ?? null,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        photo_count: loc?.photo_count ?? null,
        permission: loc?.permission.permission_status ?? null,
        priority: item.priority,
        notes: item.notes,
      };
    });
    downloadJson(`framehunt-board-${active.title.replace(/\s+/g, "-").toLowerCase()}.json`, {
      title: active.title,
      description: active.description,
      exported_at: new Date().toISOString(),
      disclaimer: "ข้อมูลการอนุญาตถ่ายทำอาจยังไม่ยืนยัน — ตรวจสอบกับเจ้าของพื้นที่หรือหน่วยงานก่อนถ่ายทำเชิงพาณิชย์",
      items: rows,
    });
  }

  function move(item: BoardItem, direction: -1 | 1) {
    if (!active) return;
    const idx = active.items.findIndex((i) => i.locationId === item.locationId);
    const next = idx + direction;
    if (next < 0 || next >= active.items.length) return;
    const items = [...active.items];
    [items[idx], items[next]] = [items[next], items[idx]];
    boardStore.update(active.id, { items });
  }

  function updateNote(item: BoardItem, notes: string) {
    if (!active) return;
    boardStore.updateItem(active.id, item.locationId, { notes });
  }

  function cyclePriority(item: BoardItem) {
    if (!active) return;
    const next = item.priority === 1 ? 2 : item.priority === 2 ? 3 : 1;
    boardStore.updateItem(active.id, item.locationId, { priority: next });
  }

  function removeItem(item: BoardItem) {
    if (!active) return;
    boardStore.removeItem(active.id, item.locationId);
    flash("นำออกจากบอร์ดแล้ว");
  }

  function deleteBoard() {
    if (!active) return;
    if (!window.confirm(`ลบบอร์ด “${active.title}” ?`)) return;
    boardStore.remove(active.id);
    closeBoard();
    flash("ลบบอร์ดแล้ว");
  }

  useSeo({
    title: "MV Boards — รวมโลเคชันสำหรับโปรเจกต์",
    description: "สร้างบอร์ดโลเคชันสำหรับมิวสิกวิดีโอ จัดลำดับความสำคัญ เพิ่มโน้ต แชร์ลิงก์ และ export shortlist ให้ทีมโปรดักชัน",
  });

  if (active) {
    const items = active.items
      .map((item) => ({ item, location: publishedLocations().find((l) => l.id === item.locationId) }))
      .filter((x) => x.location);

    return (
      <div className="container-x py-10 md:py-14">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <button
            type="button"
            onClick={closeBoard}
            className="flex items-center gap-2 font-mono text-xs tracking-normal text-concrete hover:text-acid"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ALL BOARDS
          </button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={shareBoard}>
              {copied ? <Link2 className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
              {copied ? "คัดลอกลิงก์แล้ว" : "แชร์บอร์ด"}
            </Button>
            <Button variant="outline" size="sm" onClick={exportBoard}>
              <Download className="h-3.5 w-3.5" /> EXPORT JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> PRINT
            </Button>
            <Button variant="outline" size="sm" onClick={deleteBoard} className="text-burnt">
              <Trash2 className="h-3.5 w-3.5" /> DELETE
            </Button>
          </div>
        </div>

        <header className="mt-8">
          <p className="label-mono text-acid">MV BOARD · {items.length} LOCATIONS</p>
          <h1 className="mt-3 display text-4xl md:text-6xl">{active.title}</h1>
          {active.description && (
            <p className="mt-3 max-w-2xl font-sans text-sm leading-relaxed text-concrete">{active.description}</p>
          )}
          <p className="mt-2 font-mono text-xs tracking-normal text-concrete">
            CREATED {new Date(active.createdAt).toLocaleDateString("th-TH")} · UPDATED{" "}
            {new Date(active.updatedAt).toLocaleDateString("th-TH")} · LOCAL BOARD ON THIS DEVICE
          </p>
        </header>

        <div className="mt-8 space-y-3">
          {items.length === 0 && (
            <div className="border border-dashed border-paper/15 p-10 text-center">
              <p className="font-display text-2xl font-extrabold"><Localized text={"บอร์ดยังว่าง"} /></p>
              <p className="mt-2 font-sans text-sm text-concrete"><Localized text={"เปิดโลเคชันที่สนใจ แล้วกด “ADD TO BOARD”"} /></p>
              <Link to="/explore" className="mt-4 inline-block">
                <Button size="sm"><Localized text={"ไปเลือกสถานที่"} /></Button>
              </Link>
            </div>
          )}

          {items.map(({ item, location }, index) => {
            const loc = location!;
            const cover = loc.photos.find((p) => p.is_cover) ?? loc.photos[0];
            return (
              <article
                key={item.locationId}
                className="grid gap-4 border border-line p-3 sm:grid-cols-[160px_1fr] md:grid-cols-[200px_1fr]"
              >
                <Link to={`/locations/${loc.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-ink-2">
                  <PhotoImage photo={cover} fallbackPhotos={loc.photos} galleryAssetUrl={loc.gallery_asset_url} expectedPhotoCount={loc.photo_count} sizes="200px" className="h-full w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 bg-ink/85 px-1.5 py-0.5 font-mono text-xs tracking-normal text-acid">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </Link>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="label-mono text-concrete">{language === "en" ? loc.province : loc.province_th}</p>
                      <Link to={`/locations/${loc.slug}`}>
                        <h2 className="font-display text-xl font-extrabold hover:text-acid">{language === "en" ? loc.name_en || loc.name_th : loc.name_th}</h2>
                      </Link>
                      <p className="font-sans text-xs text-concrete">{loc.name_en}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => cyclePriority(item)}
                      className={cn(
                        "border px-2 py-1 font-mono text-xs tracking-normal",
                        item.priority === 1
                          ? "border-acid bg-acid text-ink"
                          : item.priority === 2
                            ? "border-paper/30 text-concrete"
                            : "border-paper/15 text-concrete",
                      )}
                      title={t("สลับลำดับความสำคัญ")}
                    >
                      {PRIORITY_LABEL[item.priority]}
                    </button>
                  </div>

                  <input
                    value={item.notes}
                    onChange={(e) => updateNote(item, e.target.value)}
                    placeholder={t("โน้ตสำหรับทีม เช่น ต้องการแสงเช้า / ต้องขออนุญาตล่วงหน้า…")}
                    className="h-9 w-full border border-line bg-transparent px-2 font-sans text-xs text-concrete placeholder:text-concrete focus:border-acid focus:outline-none"
                    aria-label={language === "en" ? `Notes for ${loc.name_en || loc.name_th}` : `โน้ตสำหรับ ${loc.name_th}`}
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs tracking-normal text-concrete">
                      {loc.photo_count} {t("PHOTOS")} · {t(loc.permission.permission_status.toUpperCase())}
                    </span>
                    <div className="no-print ml-auto flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(item, -1)}
                        disabled={index === 0}
                        className="flex h-8 w-8 items-center justify-center border border-line text-concrete hover:border-acid hover:text-acid disabled:opacity-25"
                        aria-label={t("เลื่อนขึ้น")}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(item, 1)}
                        disabled={index === items.length - 1}
                        className="flex h-8 w-8 items-center justify-center border border-line text-concrete hover:border-acid hover:text-acid disabled:opacity-25"
                        aria-label={t("เลื่อนลง")}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="flex h-8 w-8 items-center justify-center border border-line text-concrete hover:border-burnt hover:text-burnt"
                        aria-label={t("นำออกจากบอร์ด")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-8 font-sans text-xs leading-relaxed text-concrete">
          <Localized text={"บอร์ดนี้ถูกเก็บในเบราว์เซอร์เครื่องนี้ (localStorage) — การแชร์จะส่งข้อมูลผ่านลิงก์ ไม่ได้ซิงก์กับเซิร์ฟเวอร์ จนกว่าจะเชื่อมต่อ Supabase"} /></p>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 border border-acid/50 bg-ink px-4 py-2.5 text-paper shadow-2xl">
            <span className="font-sans text-sm">{toast}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container-x py-10 md:py-14">
      <div className="glass-panel flex flex-wrap items-end justify-between gap-4 p-6 md:p-8">
        <div>
          <p className="label-mono text-acid">PROJECT WORKSPACE · {allBoards.length} BOARDS</p>
          <h1 className="mt-3 display text-4xl md:text-6xl">
            MV BOARDS<span className="text-burnt">.</span>
          </h1>
          <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-concrete">
            <Localized text={"รวมโลเคชันไว้ในโปรเจกต์เดียว จัดลำดับความสำคัญ เพิ่มโน้ต และส่ง shortlist ให้ทีม"} /></p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> NEW BOARD
        </Button>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-2xl border border-white bg-ink-2/90 p-1 shadow-clay">
        {(
          [
            { key: "boards", label: `BOARDS (${allBoards.length})` },
            { key: "saved", label: `SAVED (${savedLocations.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              const params = new URLSearchParams(sp);
              params.set("tab", t.key);
              setSp(params, { replace: true });
            }}
            className={cn(
              "label-mono rounded-xl px-4 py-2 transition-colors",
              tab === t.key ? "bg-acid text-ink" : "text-concrete hover:text-paper",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "boards" ? (
        <div className="mt-8">
          {allBoards.length === 0 ? (
            <div className="clay-panel px-5 py-10 text-center md:p-12">
              <FileText className="mx-auto h-8 w-8 text-concrete" />
              <h2 className="mt-4 font-display text-2xl font-extrabold"><Localized text={"ยังไม่มีบอร์ด"} /></h2>
              <p className="mt-2 font-sans text-sm text-concrete">
                <Localized text={"สร้างบอร์ดสำหรับ MV เรื่องต่อไป แล้วเพิ่มสถานที่จากหน้ารายละเอียด"} /></p>
              <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> <Localized text="สร้างบอร์ดแรก" /> </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allBoards.map((b) => (
                <BoardCard key={b.id} board={b} onOpen={() => openBoard(b.id)} />
              ))}
            </div>
          )}

          {store.boards.length > 0 && (
            <div className="glass-panel mt-10 p-4">
              <p className="label-mono text-concrete">IMPORT A SHARED BOARD</p>
              <p className="mt-1 font-sans text-xs text-concrete">
                <Localized text={"เปิดลิงก์ที่ได้รับจากทีม (รูปแบบ /boards?share=…) ระบบจะนำเข้าบอร์ดให้อัตโนมัติ"} /></p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8">
          {savedLocations.length === 0 ? (
            <div className="clay-panel px-5 py-10 text-center md:p-12">
              <Heart className="mx-auto h-8 w-8 text-concrete" />
              <h2 className="mt-4 font-display text-2xl font-extrabold"><Localized text={"ยังไม่มีรายการโปรด"} /></h2>
              <p className="mt-2 font-sans text-sm text-concrete"><Localized text={"กดหัวใจบนการ์ดสถานที่เพื่อบันทึกไว้ที่นี่"} /></p>
              <Link to="/explore" className="mt-5 inline-block">
                <Button><Localized text={"ไปค้นหา"} /></Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedLocations.map((loc, i) => (
                <div key={loc.id} className="relative">
                  <LocationCard location={loc} index={i} />
                  <button
                    type="button"
                    onClick={() => toggle(loc.id)}
                    className="absolute -top-2 right-0 z-30 flex h-7 items-center gap-1 border border-line bg-ink px-2 font-mono text-xs tracking-normal text-concrete hover:text-burnt"
                    aria-label={language === "en" ? `Remove ${loc.name_en || loc.name_th} from favourites` : `นำ ${loc.name_th} ออกจากรายการโปรด`}
                  >
                    <X className="h-3 w-3" /> REMOVE
                  </button>
                  {isFavorite(loc.id) && <span className="sr-only"><Localized text={"บันทึกแล้ว"} /></span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogTitle className="display text-3xl">NEW MV BOARD</DialogTitle>
          <p className="mt-2 font-sans text-sm text-concrete"><Localized text={"ตั้งชื่อโปรเจกต์และคำอธิบายสั้น ๆ สำหรับทีม"} /></p>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="board-title"><Localized text={"ชื่อบอร์ด"} /></Label>
              <Input
                id="board-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("เช่น MV01 — DARK AMBIENT / BANGKOK")}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
            </div>
            <div>
              <Label htmlFor="board-desc"><Localized text={"คำอธิบาย"} /></Label>
              <Textarea
                id="board-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("แนวเพลง ทรีตเมนต์ วันที่ถ่าย หรือข้อจำกัดของทีม")}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              <Localized text={"ยกเลิก"} /></Button>
            <Button onClick={create} disabled={!title.trim()}>
              <Clipboard className="h-4 w-4" /> <Localized text={"สร้างบอร์ด"} /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 border border-acid/50 bg-ink px-4 py-2.5 text-paper shadow-2xl">
          <span className="font-sans text-sm">{toast}</span>
        </div>
      )}
    </div>
  );
}

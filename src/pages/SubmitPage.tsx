import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ImageOff, Info, Send, ShieldAlert } from "lucide-react";
import { Badge, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { provinces } from "@/data/taxonomy";
import type { SubmissionType } from "@/data/types";
import { submissions } from "@/services/localStore";
import { useAuth } from "@/services/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { EMPTY_SUBMISSION, validateSubmission, type SubmissionFormState } from "@/lib/submission";
import { useSeo } from "@/lib/useSeo";

const TYPES: { value: SubmissionType; label: string; th: string; hint: string }[] = [
  {
    value: "new-location",
    label: "NEW LOCATION",
    th: "เสนอสถานที่ใหม่",
    hint: "สถานที่ที่ยังไม่มีในระบบ และคุณมีภาพถ่ายจริงหรือแหล่งอ้างอิงที่ตรวจสอบได้",
  },
  {
    value: "correction",
    label: "CORRECTION",
    th: "แก้ไขข้อมูลเดิม",
    hint: "พิกัดผิด ชื่อผิด คำอธิบายคลาดเคลื่อน หรือภาพไม่ตรงกับสถานที่",
  },
  {
    value: "permission-doc",
    label: "PERMISSION",
    th: "ส่งเอกสารอนุญาตถ่ายทำ",
    hint: "มีหนังสืออนุญาต ข้อกำหนด หรือข้อมูลติดต่ออย่างเป็นทางการจากเจ้าของพื้นที่",
  },
];

type FormState = SubmissionFormState;

const EMPTY = EMPTY_SUBMISSION;

function validate(form: FormState): Record<string, string> {
  return validateSubmission(form);
}

export default function SubmitPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>({ ...EMPTY, email: user?.email ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState<{ remote: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const activeType = useMemo(() => TYPES.find((t) => t.value === form.type)!, [form.type]);

  useSeo({
    title: "เสนอสถานที่ / แก้ไขข้อมูล",
    description: "ส่งสถานที่ถ่ายทำใหม่หรือแจ้งแก้ไขข้อมูลให้ FRAMEHUNT THAILAND ระบบตรวจสอบภาพถ่ายจริงและแหล่งอ้างอิงก่อนเผยแพร่ทุกครั้ง",
    canonical: `${window.location.origin}/submit`,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (form.trap) return; // honeypot
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSending(true);
    setServerError(null);
    const payload = {
      type: form.type,
      name: form.name.trim(),
      province: form.province,
      description: form.description.trim(),
      coordinates: form.coordinates.trim(),
      sourceUrl: form.sourceUrl.trim(),
      contact: form.contact.trim(),
      photoNote: form.photoNote.trim(),
      permissionNote: form.permissionNote.trim(),
      submitterEmail: form.email.trim(),
    };

    try {
      if (isSupabaseConfigured) {
        const response = await fetch("/api/submissions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, email: payload.submitterEmail }),
        });
        if (response.status !== 202) {
          setServerError(response.status === 429 ? "ส่งบ่อยเกินไป โปรดรอสักครู่แล้วลองอีกครั้ง" : "ส่งข้อมูลไม่สำเร็จ โปรดลองอีกครั้ง");
          return;
        }
      } else {
        submissions.add(payload);
      }
    } catch {
      setServerError("ส่งข้อมูลไม่สำเร็จ โปรดลองอีกครั้ง");
      return;
    } finally {
      setSending(false);
    }
    setSent({ remote: isSupabaseConfigured });
    setForm({ ...EMPTY, email: form.email });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (sent) {
    return (
      <div className="container-x flex min-h-[65vh] items-center justify-center py-20">
        <div className="w-full max-w-xl border border-line p-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-acid" />
          <p className="label-mono mt-5 text-acid">RECEIVED</p>
          <h1 className="display mt-3 text-4xl">ได้รับข้อมูลแล้ว</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-concrete">
            {sent.remote
              ? "ข้อมูลถูกส่งไปยังคิวตรวจสอบบนเซิร์ฟเวอร์แล้ว ทีมงานจะตรวจแหล่งอ้างอิงและภาพถ่ายก่อนเผยแพร่"
              : "บันทึกไว้ในเครื่องนี้แล้ว (โหมดออฟไลน์) — ยังไม่ได้ส่งขึ้นเซิร์ฟเวอร์ เพราะยังไม่ได้ตั้งค่า Supabase ในสภาพแวดล้อมนี้"}
          </p>
          <div className="mt-5 border border-paper/15 p-4 text-left">
            <p className="font-display text-sm font-extrabold ">ขั้นตอนถัดไป</p>
            <ul className="mt-2 space-y-1.5 font-sans text-xs leading-relaxed text-concrete">
              <li>1. ทีมบรรณาธิการตรวจชื่อ จังหวัด และแหล่งอ้างอิง</li>
              <li>2. ต้องได้ภาพถ่ายจริงที่ตรวจสอบสิทธิ์แล้ว ≥5 ภาพจากหมวด Commons ของสถานที่นั้น</li>
              <li>3. ตรวจสถานะการขออนุญาตและข้อจำกัดโดรนแยกต่างหาก</li>
              <li>4. เผยแพร่เมื่อผ่านทุกเกณฑ์เท่านั้น — ไม่มีข้อยกเว้น</li>
            </ul>
          </div>
          <div className="mt-7 flex justify-center gap-3">
            <Button onClick={() => setSent(null)}>ส่งอีกรายการ</Button>
            <Link to="/explore">
              <Button variant="outline">กลับไปค้นหา</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <section className="glass-panel mx-4 mt-5 sm:mx-8 lg:mx-12">
        <div className="container-x py-9 md:py-12">
          <p className="label-mono text-acid">CONTRIBUTE / 03</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            SEND US
            <br />
            <span className="text-outline">A PLACE.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-concrete">
            เสนอสถานที่หรือแจ้งข้อมูลที่คลาดเคลื่อน เราไม่รับอัปโหลดภาพโดยตรงเพราะต้องตรวจใบอนุญาตจากต้นทางก่อน — แนบลิงก์แหล่งภาพหรือหมวด
            Wikimedia Commons มาแทน
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant="acid">≥5 VERIFIED PHOTOS</Badge>
            <Badge>COORDINATES REQUIRED</Badge>
            <Badge>NO AI IMAGERY</Badge>
            <Badge>PERMISSION ≠ PUBLIC ACCESS</Badge>
          </div>
        </div>
      </section>

      <div className="container-x py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              <fieldset>
                <legend className="label-mono mb-3 text-concrete">01 / ประเภทคำขอ</legend>
                <div className="grid gap-px bg-line sm:grid-cols-3">
                  {TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => update("type", type.value)}
                      aria-pressed={form.type === type.value}
                      className={`bg-ink p-4 text-left transition-colors ${
                        form.type === type.value ? "bg-acid text-ink" : "hover:bg-ink-2"
                      }`}
                    >
                      <span className="block font-mono text-xs tracking-normal">{type.label}</span>
                      <span
                        className={`mt-1 block font-display text-base font-extrabold ${form.type === type.value ? "text-ink" : "text-paper"}`}
                      >
                        {type.th}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 font-sans text-xs leading-relaxed text-concrete">{activeType.hint}</p>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="label-mono mb-3 text-concrete">02 / ข้อมูลสถานที่</legend>

                <div>
                  <Label htmlFor="sub-name">ชื่อสถานที่ *</Label>
                  <Input
                    id="sub-name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="เช่น โรงภาพยนตร์ร้างศรีเกษม"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "err-name" : undefined}
                  />
                  {errors.name && (
                    <p id="err-name" className="mt-1.5 font-sans text-xs text-burnt">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="sub-province">จังหวัด *</Label>
                    <Select
                      id="sub-province"
                      value={form.province}
                      onChange={(e) => update("province", e.target.value)}
                      aria-invalid={Boolean(errors.province)}
                    >
                      <option value="">— เลือกจังหวัด —</option>
                      {provinces.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name_th} ({p.name_en})
                        </option>
                      ))}
                    </Select>
                    {errors.province && <p className="mt-1.5 font-sans text-xs text-burnt">{errors.province}</p>}
                  </div>
                  <div>
                    <Label htmlFor="sub-coords">พิกัด (ถ้าทราบ)</Label>
                    <Input
                      id="sub-coords"
                      value={form.coordinates}
                      onChange={(e) => update("coordinates", e.target.value)}
                      placeholder="13.75630, 100.50180"
                      inputMode="decimal"
                      aria-invalid={Boolean(errors.coordinates)}
                    />
                    {errors.coordinates ? (
                      <p className="mt-1.5 font-sans text-xs text-burnt">{errors.coordinates}</p>
                    ) : (
                      <p className="mt-1.5 font-sans text-xs text-concrete">
                        คัดลอกจาก Google Maps หรือ Wikidata — อย่าประมาณเอง
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="sub-description">อธิบายสถานที่และสิ่งที่เห็น *</Label>
                  <Textarea
                    id="sub-description"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="ลักษณะสถาปัตยกรรม บรรยากาศ แสงธรรมชาติ หรือช่วงเวลาที่ควรไป พร้อมเหตุผลว่าทำไมเหมาะกับงานภาพ"
                    aria-invalid={Boolean(errors.description)}
                  />
                  <div className="mt-1.5 flex justify-between gap-3">
                    {errors.description ? (
                      <p className="font-sans text-xs text-burnt">{errors.description}</p>
                    ) : (
                      <p className="font-sans text-xs text-concrete">หลีกเลี่ยงคำโฆษณา — เขียนสิ่งที่ตาคนเห็นจริง</p>
                    )}
                    <span className="font-mono text-xs text-concrete">{form.description.trim().length}/30</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sub-source">ลิงก์แหล่งอ้างอิง</Label>
                  <Input
                    id="sub-source"
                    type="url"
                    value={form.sourceUrl}
                    onChange={(e) => update("sourceUrl", e.target.value)}
                    placeholder="https://commons.wikimedia.org/wiki/Category:..."
                    aria-invalid={Boolean(errors.sourceUrl)}
                  />
                  {errors.sourceUrl && <p className="mt-1.5 font-sans text-xs text-burnt">{errors.sourceUrl}</p>}
                </div>
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="label-mono mb-3 text-concrete">03 / ภาพและสิทธิ์</legend>

                <div>
                  <Label htmlFor="sub-photos">ลิงก์ภาพหรือหมวดภาพที่มีใบอนุญาต</Label>
                  <Textarea
                    id="sub-photos"
                    value={form.photoNote}
                    onChange={(e) => update("photoNote", e.target.value)}
                    placeholder="วางลิงก์ Wikimedia Commons, คลังภาพหน่วยงานรัฐ หรือระบุชื่อช่างภาพและใบอนุญาต"
                    className="min-h-20"
                  />
                </div>

                <div>
                  <Label htmlFor="sub-permission">ข้อมูลการขออนุญาต (ถ้ามี)</Label>
                  <Textarea
                    id="sub-permission"
                    value={form.permissionNote}
                    onChange={(e) => update("permissionNote", e.target.value)}
                    placeholder="เช่น ต้องทำหนังสือถึงสำนักงานเขต, มีค่าธรรมเนียม, ห้ามโดรน — แนบลิงก์เอกสารถ้ามี"
                    className="min-h-20"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="sub-contact">ช่องทางติดต่อเจ้าของพื้นที่</Label>
                    <Input
                      id="sub-contact"
                      value={form.contact}
                      onChange={(e) => update("contact", e.target.value)}
                      placeholder="โทรศัพท์ / อีเมล / เว็บไซต์ทางการ"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sub-email">อีเมลของคุณ (สำหรับติดตามผล)</Label>
                    <Input
                      id="sub-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@example.com"
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && <p className="mt-1.5 font-sans text-xs text-burnt">{errors.email}</p>}
                  </div>
                </div>

                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={form.trap}
                  onChange={(e) => update("trap", e.target.value)}
                  className="hidden"
                />
              </fieldset>

              {serverError && (
                <div className="border border-burnt/50 bg-burnt/5 p-4">
                  <p className="font-mono text-xs tracking-normal text-burnt">SERVER REJECTED</p>
                  <p className="mt-1 font-sans text-xs text-concrete">{serverError}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-sm font-sans text-xs leading-relaxed text-concrete">
                  การส่งข้อมูลไม่ได้แปลว่าได้รับอนุมัติเผยแพร่ ทุกรายการต้องผ่านการตรวจสอบโดยบรรณาธิการ
                </p>
                <Button type="submit" size="lg" disabled={sending}>
                  <Send className="h-3.5 w-3.5" />
                  {sending ? "กำลังส่ง…" : "ส่งเพื่อตรวจสอบ"}
                </Button>
              </div>
            </form>
          </div>

          <aside className="lg:col-span-5">
            <div className="sticky top-24 space-y-5">
              <div className="clay-panel p-5">
                <p className="label-mono text-acid">WHAT WE ACCEPT</p>
                <ul className="mt-4 space-y-3">
                  {[
                    "สถานที่จริงในประเทศไทยที่เข้าถึงได้หรือเคยเข้าถึงได้",
                    "ภาพถ่ายจริง ≥5 ภาพ พร้อมชื่อช่างภาพและใบอนุญาต",
                    "พิกัดที่ตรวจสอบย้อนกลับได้ ไม่ใช่การประมาณ",
                    "ข้อมูลการขออนุญาตที่มีเอกสารหรือแหล่งทางการรองรับ",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5 border-b border-line pb-3 last:border-0">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-acid" />
                      <p className="font-sans text-xs leading-relaxed text-concrete">{item}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-burnt/40 p-5">
                <div className="flex items-center gap-2">
                  <ImageOff className="h-4 w-4 text-burnt" aria-hidden />
                  <p className="font-mono text-xs tracking-normal text-burnt">NOT ACCEPTED</p>
                </div>
                <ul className="mt-3 space-y-2 font-sans text-xs leading-relaxed text-concrete">
                  <li>• ภาพจาก Instagram, TikTok หรือ Google Maps ที่ไม่มีใบอนุญาต</li>
                  <li>• ภาพ AI-generated หรือภาพแต่งจนเปลี่ยนสภาพสถานที่</li>
                  <li>• พิกัดที่เดาจากแผนที่โดยไม่มีแหล่งอ้างอิง</li>
                  <li>• คำยืนยันว่า “ถ่ายได้” โดยไม่มีเอกสารจากเจ้าของพื้นที่</li>
                </ul>
              </div>

              <div className="clay-panel p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-concrete" aria-hidden />
                  <p className="font-mono text-xs tracking-normal text-concrete">PRIVACY</p>
                </div>
                <p className="mt-3 font-sans text-xs leading-relaxed text-concrete">
                  {isSupabaseConfigured
                    ? "แบบฟอร์มนี้ส่งข้อมูลไปยังฐานข้อมูลที่ตั้งค่าไว้ โดยเก็บอีเมลเฉพาะเพื่อติดตามผลคำขอ"
                    : "โหมดปัจจุบันยังไม่ได้เชื่อมต่อฐานข้อมูลภายนอก ข้อมูลจึงถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น และจะหายเมื่อล้างข้อมูลเว็บไซต์"}
                </p>
                <p className="mt-2 font-mono text-xs tracking-normal text-concrete">
                  {isSupabaseConfigured ? "SUPABASE CONNECTED" : "LOCAL MODE — NOT SENT"}
                </p>
              </div>

              <div className="flex items-start gap-2 border border-line p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-concrete" aria-hidden />
                <p className="font-sans text-xs leading-relaxed text-concrete">
                  ต้องการรายงานข้อมูลผิดบนหน้าโลเคชัน ใช้ปุ่ม “Report” ในหน้ารายละเอียดนั้นได้เลย รายงานจะไปอยู่ในคิวของ Admin
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

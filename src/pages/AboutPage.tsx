import { Link } from "react-router-dom";
import { ArrowUpRight, Camera, Database, FileWarning, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { Badge, Button } from "@/components/ui";
import { datasetMeta, locationStats } from "@/services/locations";
import { useSeo } from "@/lib/useSeo";

const LICENSE_ORDER = [
  "CC BY-SA 4.0",
  "CC BY-SA 3.0",
  "CC BY 4.0",
  "CC BY 2.0",
  "CC BY 3.0",
  "CC BY-SA 2.0",
  "CC0",
  "Public domain",
];

const PRINCIPLES = [
  {
    icon: Camera,
    title: "ภาพจริงเท่านั้น",
    body: "ทุกภาพมาจาก Wikimedia Commons หรือคลังภาพสาธารณะที่ระบุใบอนุญาตชัดเจน เราไม่ใช้ภาพ AI ภาพสต็อก หรือภาพจากโซเชียลมีเดียที่ไม่มีสิทธิ์ยืนยัน",
  },
  {
    icon: ShieldCheck,
    title: "5 ภาพขึ้นไปจึงเผยแพร่",
    body: `สถานที่ทุกแห่งที่ปรากฏแบบสาธารณะต้องมีภาพถ่ายจริงที่ตรวจสอบแล้วอย่างน้อย ${datasetMeta.min_photos_required} ภาพ มีพิกัดที่ยืนยันได้ และมีแหล่งอ้างอิง ถ้าไม่ผ่านเกณฑ์จะอยู่ในสถานะ Draft และไม่แสดงในหน้าค้นหาหรือแผนที่`,
  },
  {
    icon: FileWarning,
    title: "ไม่เดาสิทธิ์ถ่ายทำ",
    body: "การเข้าถึงสาธารณะไม่เท่ากับสิทธิ์ถ่ายทำเชิงพาณิชย์ และไม่เท่ากับการอนุญาตให้บินโดรน สถานะที่ยังไม่มีเอกสารยืนยันจะแสดงเป็น “ยังไม่มีข้อมูลยืนยัน” เสมอ",
  },
  {
    icon: MapPin,
    title: "พิกัดมีที่มา",
    body: "พิกัดทุกจุดดึงจาก Wikidata (property P625) พร้อมเก็บ URL ของแหล่งที่มาและระดับความมั่นใจ ไม่มีการประมาณพิกัดจากภาพหรือเดาจากชื่อสถานที่",
  },
];

const NOT_CLAIMED = [
  "เราไม่ได้เป็นตัวแทนของหน่วยงานรัฐหรือเจ้าของสถานที่",
  "เราไม่ได้รับประกันว่าถ่ายทำเชิงพาณิชย์ได้ ณ สถานที่ใดสถานที่หนึ่ง",
  "เราไม่ได้รับประกันว่าโดรนบินได้ แม้สถานที่นั้นจะเป็นพื้นที่เปิดสาธารณะ",
  "เราไม่รับประกันค่าเข้าสถานที่ เวลาทำการ หรือข้อจำกัดของcrew เพราะยังไม่มีแหล่งยืนยัน",
  "เราไม่ใช้ภาพ AI เพื่อแต่งเติมสถานที่ให้ดูดีกว่าความเป็นจริง",
];

export default function AboutPage() {
  const stats = locationStats();
  const licenses = Object.entries(datasetMeta.license_breakdown).sort(
    (a, b) => LICENSE_ORDER.indexOf(a[0]) - LICENSE_ORDER.indexOf(b[0]) || b[1] - a[1],
  );
  const totalPhotos = licenses.reduce((n, [, count]) => n + count, 0);

  useSeo({
    title: "นโยบายข้อมูล ใบอนุญาต และข้อจำกัด",
    description: "วิธีที่ FRAMEHUNT ตรวจสอบโลเคชัน ภาพถ่าย พิกัด และสิทธิ์การถ่ายทำ พร้อมตัวเลขจริงและสิ่งที่เราไม่รับประกัน",
    canonical: `${window.location.origin}/about`,
  });

  return (
    <div className="bg-ink pb-24">
      {/* Header */}
      <section className="border-b border-line">
        <div className="container-x py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-8">
              <p className="label-mono text-acid">ABOUT / METHODOLOGY</p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight md:text-7xl">
                NO FAKE
                <br />
                <span className="text-outline">FRAMES.</span>
              </h1>
              <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-concrete">
                FRAMEHUNT THAILAND คือคลังโลเคชันสำหรับมิวสิกวิดีโอ ภาพยนตร์ และงานภาพเชิงพาณิชย์
                ที่สร้างจากข้อมูลเปิดและภาพถ่ายที่มีใบอนุญาตชัดเจน เป้าหมายของเราคือทำให้ทีมโปรดักชัน ตรวจสอบสถานที่ได้จริงก่อนออกกอง
                ไม่ใช่ดูภาพสวยแล้วไปเจอของจริงไม่ตรง
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Badge variant="acid">REAL COORDINATES</Badge>
                <Badge variant="acid">LICENSED PHOTOS</Badge>
                <Badge>UNKNOWN ≠ ALLOWED</Badge>
                <Badge>NO AI IMAGERY</Badge>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="border border-line p-5">
                <p className="label-mono text-concrete">DATASET SNAPSHOT</p>
                <dl className="mt-4 space-y-3">
                  {[
                    ["Published", stats.published],
                    ["Draft (รอภาพ)", stats.draft],
                    ["Provinces covered", stats.provincesCovered],
                    ["Verified photos", stats.verifiedPhotos],
                    ["Photographers credited", stats.photographers],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex items-baseline justify-between gap-3 border-b border-line pb-2"
                    >
                      <dt className="font-sans text-xs text-concrete">{label}</dt>
                      <dd className="font-display text-xl font-extrabold text-paper">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 font-mono text-xs leading-relaxed tracking-normal text-concrete">
                  SNAPSHOT {new Date(datasetMeta.generated_at).toISOString().slice(0, 10)} · SOURCE{" "}
                  {datasetMeta.source.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="container-x py-14 md:py-20">
        <SectionHeading
          title={
            <>
              หลักที่เรา
              <br />
              ไม่ยอมข้าม
            </>
          }
          description="ทุกข้อด้านล่างถูกบังคับใช้ใน pipeline นำเข้าและตัวแอป ไม่ใช่แค่คำโฆษณา"
        />
        <div className="mt-10 grid gap-px bg-line md:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="bg-ink p-6 md:p-8">
              <p.icon className="h-5 w-5 text-acid" aria-hidden />
              <h3 className="mt-5 font-display text-xl font-extrabold tracking-tight">{p.title}</h3>
              <p className="mt-3 font-sans text-sm leading-relaxed text-concrete">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="border-y border-line bg-ink-2">
        <div className="container-x py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <p className="label-mono text-acid">02 / PIPELINE</p>
              <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] md:text-5xl">
                จาก Wikidata
                <br />
                สู่หน้าเว็บ
              </h2>
              <p className="mt-4 font-sans text-sm leading-relaxed text-concrete">
                กระบวนการทำงานซ้ำได้ด้วยสคริปต์เดียว และเก็บรายงานทุกครั้งที่รัน
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => window.open("https://www.wikidata.org", "_blank", "noopener")}
              >
                ดูแหล่งข้อมูลต้นทาง <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="md:col-span-8">
              <ol className="space-y-5">
                {[
                  ["01", "Seed", "รายชื่อสถานที่ตั้งต้น 65 รายการ กระจายตามโซน A (กรุงเทพฯ), B (ปริมณฑล), C (77 จังหวัด)"],
                  ["02", "Resolve", "ค้นหา Wikidata entity ที่ตรงกับชื่อและจังหวัด ตรวจ P625 พิกัด และ Commons category (P373)"],
                  [
                    "03",
                    "Fetch photos",
                    "ดึงภาพจากหมวด Commons ของสถานที่นั้นเท่านั้น พร้อมตรวจขนาด ใบอนุญาต SHA-1 และ perceptual hash กันภาพซ้ำ",
                  ],
                  ["04", "Gate", "ต้องมีภาพยืนยัน ≥5 ภาพ พิกัด numeric และแหล่งอ้างอิง ไม่งั้นเป็น Draft — ห้ามเผยแพร่"],
                  ["05", "Publish", "สร้างชุดข้อมูล JSON ที่แอปอ่านโดยตรง พร้อมรายงานจำนวนที่ผ่าน/ไม่ผ่านและเหตุผล"],
                ].map(([n, title, body]) => (
                  <li key={n} className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line pb-5">
                    <span className="font-mono text-xs text-acid">{n}</span>
                    <div>
                      <p className="font-display text-lg font-extrabold ">{title}</p>
                      <p className="mt-1 font-sans text-sm leading-relaxed text-concrete">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Licensing */}
      <section className="container-x py-14 md:py-20">
        <SectionHeading
          title={
            <>
              ภาพทุกภาพ
              <br />
              มีเจ้าของ
            </>
          }
          description={`${totalPhotos} ภาพในชุดข้อมูลนี้มาจาก ${stats.photographers} ช่างภาพ แต่ละภาพแสดงเครดิตและใบอนุญาตบนหน้ารายละเอียดสถานที่`}
        />
        <div className="clay-panel mt-8 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left">
            <thead>
              <tr className="border-b border-line bg-ink-2">
                <th scope="col" className="label-mono px-4 py-3 text-concrete">
                  ใบอนุญาต
                </th>
                <th scope="col" className="label-mono px-4 py-3 text-right text-concrete">
                  จำนวนภาพ
                </th>
                <th scope="col" className="label-mono px-4 py-3 text-right text-concrete">
                  สัดส่วน
                </th>
              </tr>
            </thead>
            <tbody>
              {licenses.map(([license, count]) => (
                <tr key={license} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-sans text-sm text-paper/75">{license}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-concrete">{count}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-acid">
                    {totalPhotos ? `${Math.round((count / totalPhotos) * 100)}%` : "0%"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl font-sans text-xs leading-relaxed text-concrete">
          ภาพถูกแสดงแบบ hotlink จาก Wikimedia Commons ตามแนวทางของต้นทาง เราไม่คัดลอกหรืออ้างสิทธิ์ในภาพ
          หากต้องการใช้งานนอกเหนือจากใบอนุญาต โปรดติดต่อช่างภาพหรือตรวจเงื่อนไขของใบอนุญาตนั้นโดยตรง
        </p>
      </section>

      {/* Not claimed */}
      <section className="border-y border-line bg-paper text-ink">
        <div className="container-x py-14 md:py-20">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <p className="label-mono text-ink/90">04 / LIMITS</p>
              <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight tracking-[-0.04em] text-ink md:text-6xl">
                สิ่งที่เรา
                <br />
                <span className="text-burnt">ไม่รับประกัน</span>
              </h2>
            </div>
            <div className="md:col-span-7">
              <ul className="space-y-4">
                {NOT_CLAIMED.map((item) => (
                  <li key={item} className="flex gap-3 border-b border-ink/15 pb-4">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-burnt" />
                    <p className="font-sans text-sm leading-relaxed text-ink/90">{item}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-8 border border-ink/20 p-5">
                <p className="font-display text-lg font-extrabold ">ก่อนออกกองทุกครั้ง</p>
                <p className="mt-2 font-sans text-sm leading-relaxed text-ink/90">
                  โทรหรืออีเมลหาหน่วยงานเจ้าของพื้นที่โดยตรง ตรวจข้อกำหนดเรื่องไฟ โดรน จำนวนcrew และค่าธรรมเนียม
                  แล้วเก็บหลักฐานการอนุญาตเป็นลายลักษณ์อักษร
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data quality + contact */}
      <section className="container-x py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="border border-line p-6">
            <Database className="h-5 w-5 text-acid" aria-hidden />
            <h3 className="mt-4 font-display text-lg font-extrabold ">สถานะข้อมูล</h3>
            <p className="mt-2 font-sans text-sm leading-relaxed text-concrete">
              {stats.total} รายการในรายงานนำเข้า · {stats.published} เผยแพร่ · {stats.draft} ฉบับร่าง ·{" "}
              {datasetMeta.rejected} ถูกปฏิเสธเพราะไม่มีข้อมูลพอ
            </p>
            <Link
              to="/admin"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs tracking-normal text-acid hover:underline"
            >
              ดูรายงานคุณภาพข้อมูล <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border border-line p-6">
            <Sparkles className="h-5 w-5 text-acid" aria-hidden />
            <h3 className="mt-4 font-display text-lg font-extrabold ">แก้ไขข้อมูล</h3>
            <p className="mt-2 font-sans text-sm leading-relaxed text-concrete">
              พบพิกัดผิด ภาพไม่ตรงสถานที่ หรือมีเอกสารอนุญาตที่ควรเผยแพร่ แจ้งเราได้ผ่านฟอร์มเสนอสถานที่ โดยเลือกประเภท “แก้ไขข้อมูล”
            </p>
            <Link
              to="/submit"
              className="mt-4 inline-flex items-center gap-1 font-mono text-xs tracking-normal text-acid hover:underline"
            >
              ส่งข้อมูลแก้ไข <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="border border-line p-6">
            <FileWarning className="h-5 w-5 text-burnt" aria-hidden />
            <h3 className="mt-4 font-display text-lg font-extrabold ">ข้อจำกัดปัจจุบัน</h3>
            <p className="mt-2 font-sans text-sm leading-relaxed text-concrete">
              ชุดข้อมูลนี้ยังไม่ครอบคลุมทั้ง 77 จังหวัด และยังไม่มีข้อมูลการขออนุญาตถ่ายทำที่ยืนยันแล้ว เราจะแสดงเฉพาะสิ่งที่ตรวจสอบได้
              และปล่อยช่องว่างไว้แทนการเดา
            </p>
            <p className="mt-4 font-mono text-xs tracking-normal text-concrete">
              LAST INGEST {new Date(datasetMeta.generated_at).toISOString().slice(0, 10)}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-line pt-8 md:flex-row md:items-center">
          <p className="max-w-xl font-sans text-sm leading-relaxed text-concrete">
            หน้านี้อธิบายนโยบายข้อมูลของเวอร์ชันปัจจุบัน ไม่ใช่ข้อตกลงทางกฎหมาย การใช้งานภาพแต่ละภาพเป็นไปตามใบอนุญาตของภาพนั้น
          </p>
          <div className="flex gap-3">
            <Link to="/explore">
              <Button variant="primary">เริ่มค้นหาโลเคชัน</Button>
            </Link>
            <Link to="/map">
              <Button variant="outline">เปิดแผนที่</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

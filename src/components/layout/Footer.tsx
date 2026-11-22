import { Localized } from "@/i18n/Language";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useLocationCatalog } from "@/services/catalogContext";

export function Footer() {
  const stats = useLocationCatalog().locationStats();
  return (
    <footer className="border-t border-white bg-lilac/45">
      <div className="container-x py-14 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="display text-3xl md:text-4xl">Framehunt Thailand</p>
            <p className="mt-5 max-w-md font-sans text-sm leading-relaxed text-concrete"> <Localized text="แพลตฟอร์มค้นหาโลเคชันสำหรับมิวสิกวิดีโอ ภาพยนตร์ และงานภาพทั่วประเทศไทย\n              ภาพสถานที่มีเครดิตและข้อมูลใบอนุญาตประกอบ" /> </p>
          </div>

          <div className="md:col-span-3">
            <p className="label-mono mb-5 text-concrete">EXPLORE</p>
            <ul className="space-y-2.5 font-sans text-sm text-concrete">
              <li>
                <Link to="/explore" className="hover:text-acid"> <Localized text="ค้นหาโลเคชัน" /> </Link>
              </li>
              <li>
                <Link to="/food" className="hover:text-acid"> <Localized text="ร้านอร่อย หมูกระทะ และบุฟเฟต์" /> </Link>
              </li>
              <li>
                <Link to="/secondhand" className="hover:text-acid"> <Localized text="ร้านมือสองและโกดังญี่ปุ่น" /> </Link>
              </li>
              <li>
                <Link to="/activities" className="hover:text-acid"> <Localized text="กิจกรรม กีฬา และออกกำลังกาย" /> </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-acid"> <Localized text="แผนที่" /> </Link>
              </li>
              <li>
                <Link to="/find-my-vibe" className="hover:text-acid">
                  Find My Vibe
                </Link>
              </li>
              <li>
                <Link to="/boards" className="hover:text-acid">
                  MV Boards
                </Link>
              </li>
              <li>
                <Link to="/submit" className="hover:text-acid"> <Localized text="เสนอสถานที่" /> </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-acid">
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="label-mono mb-5 text-concrete">DATA & LICENSING</p>
            <ul className="space-y-2.5 font-sans text-sm text-concrete">
              <li>
                <a
                  href="https://www.wikidata.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-acid"
                >
                  Wikidata <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://commons.wikimedia.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-acid"
                >
                  Wikimedia Commons <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.tourismthailand.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-acid"
                >
                  Tourism Authority of Thailand <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
              <li>
                <Link to="/about" className="hover:text-acid"> <Localized text="นโยบายข้อมูล & ใบอนุญาต" /> </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <p className="label-mono text-concrete">© {new Date().getFullYear()} FRAMEHUNT THAILAND — BANGKOK</p>
          <p className="label-mono text-concrete">
            {stats.published} LOCATIONS · {stats.provincesCovered} PROVINCES · {stats.verifiedPhotos} PHOTOS
          </p>
          <p className="label-mono text-concrete">
            {stats.generatedAt && `DATA UPDATED ${new Date(stats.generatedAt).toISOString().slice(0, 10)}`}
          </p>
        </div>
        <p className="mt-6 max-w-4xl font-sans text-xs leading-relaxed text-concrete"> <Localized text="ภาพถ่ายทุกภาพแสดงพร้อมเครดิต ผู้ถ่าย และใบอนุญาตจากต้นทาง เราไม่ใช้ภาพ AI แทนสถานที่จริง\n          และไม่รับประกันว่าสถานที่ทุกแห่งอนุญาตให้ถ่ายทำเชิงพาณิชย์ — โปรดติดต่อหน่วยงานหรือเจ้าของพื้นที่ก่อนทุกครั้ง" /> </p>
      </div>
    </footer>
  );
}

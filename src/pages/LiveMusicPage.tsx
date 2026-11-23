import { Localized, useLanguage } from "@/i18n/Language";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { programs, sceneGenres, sceneVenues, venueKinds, venueKindByName, type SceneGenre } from "@/data/live-programs";
import { provinceBySlug } from "@/data/taxonomy";
import { useSeo } from "@/lib/useSeo";

const sourceProvinces = [...new Set(programs.map((program) => program.province))];

function EventPoster({ poster, title }: { poster?: string; title: string }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  if (!poster || failed) {
    return (
      <span className="flex h-36 w-24 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-white/80 bg-lilac/55 px-2 text-center text-[10px] font-medium leading-snug text-[#526175] sm:h-40 sm:w-28" role="img" aria-label={`${t("โปสเตอร์งาน")}: ${title}`}>
        <ImageOff className="h-5 w-5" aria-hidden />
        <span><Localized text={failed ? "โปสเตอร์โหลดไม่สำเร็จ" : "ยังไม่มีโปสเตอร์จากผู้จัด"} /></span>
      </span>
    );
  }
  return <img className="h-36 w-24 shrink-0 rounded-xl border border-white/70 object-cover shadow-sm sm:h-40 sm:w-28" src={poster} alt={`${t("โปสเตอร์งาน")}: ${title}`} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

export default function LiveMusicPage() {
  const { language, t } = useLanguage();
  const dateLabel = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" });
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const genre = params.get("genre") ?? "";
  const province = params.get("province") ?? "";
  const venueType = params.get("venue") ?? "";
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
  useSeo({ title: "งานดนตรีสดและซีนใต้ดิน", description: "ติดตามงานแรป อินดี้ Noise, Experimental, Sound Art และดนตรีสด พร้อมโปสเตอร์และแหล่งประกาศจากผู้จัด" });

  function patch(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  const matches = programs.filter(
    (item) =>
      (!genre || item.genres.includes(genre as SceneGenre)) &&
      (!province || province === item.province) &&
      (!venueType || venueKindByName[item.venue] === venueType) &&
      `${item.venue} ${item.title}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const matchesVenues = sceneVenues.filter(
    (item) =>
      (!genre || item.genres.includes(genre as SceneGenre)) &&
      (!province || province === item.province) &&
      (!venueType || item.kind === venueType) &&
      `${item.name} ${item.area}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const upcoming = matches
    .filter((item) => item.date && (item.endDate ?? item.date) >= today)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const references = matches.filter((item) => !item.date);
  const previous = matches
    .filter((item) => item.date && (item.endDate ?? item.date) < today)
    .sort((a, b) => b.date!.localeCompare(a.date!));
  const sections = [
    { title: t("งานที่ประกาศวันแล้ว"), items: upcoming },
    { title: t("แหล่งติดตามและประวัติการจัดงาน"), items: references },
    { title: t("งานที่ผ่านมา"), items: previous },
  ];

  return (
    <div className="container-x py-10 md:py-16">
      <div className="glass-panel bg-lilac/35 p-6 sm:p-9">
        <h1 className="display text-4xl md:text-6xl">
          LIVE MUSIC<span className="text-burnt">.</span>
        </h1>
        <p className="mt-3 text-sm text-concrete"><Localized text="งานแรป อินดี้ Noise, Experimental และ Sound Art พร้อมโปสเตอร์งานจากผู้จัด" /></p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            className="clay-control border border-white bg-ink px-4 py-2 text-sm font-semibold text-acid hover:bg-sage"
            to="/explore?categories=live-music,underground-music,hip-hop"
          >
            <Localized text="ดูโลเคชันพร้อมภาพ" />
          </Link>
          <Link
            className="clay-control border border-white bg-white/90 px-4 py-2 text-sm font-semibold text-[#315b50] hover:bg-[#315b50] hover:text-white"
            to="/studios"
          > <Localized text="ห้องซ้อมดนตรี กทม.-ปริมณฑล" /> </Link>
          <Link
            className="clay-control border border-white bg-ink px-4 py-2 text-sm font-semibold text-acid hover:bg-sage"
            to="/submit"
          >
            <Localized text="เสนอเวทีเพิ่ม" />
          </Link>
        </div>
      </div>
      <div className="clay-panel my-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          aria-label={t("ค้นหางานหรือเวที")}
          placeholder={t("ค้นหางานหรือเวที")}
          value={query}
          onChange={(e) => patch("q", e.target.value)}
        />
        <Select aria-label={t("แนวดนตรี")} value={genre} onChange={(e) => patch("genre", e.target.value)}>
          <option value=""><Localized text="ทุกแนวดนตรี" /></option>
          {Object.entries(sceneGenres).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("ประเภทเวที")} value={venueType} onChange={(e) => patch("venue", e.target.value)}>
          <option value=""><Localized text="ทุกประเภทเวที" /></option>
          {Object.entries(venueKinds).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("จังหวัดของงาน")} value={province} onChange={(e) => patch("province", e.target.value)}>
          <option value=""> <Localized text="ทุกจังหวัด" /> </option>
          {sourceProvinces.map((value) => (
            <option key={value} value={value}>
              {language === "en" ? provinceBySlug.get(value)?.name_en ?? value : provinceBySlug.get(value)?.name_th ?? value}
            </option>
          ))}
        </Select>
      </div>
      {matches.length === 0 && matchesVenues.length === 0 && (
        <p className="border-y border-line py-7 text-concrete"><Localized text="ไม่พบงานหรือเวทีตามที่เลือก" /></p>
      )}
      {sections
        .filter(({ items }) => items.length)
        .map(({ title, items }) => (
          <section key={title} className="mb-8">
            <h2 className="mb-4 text-lg font-bold">{title}</h2>
            <ul className="grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <li key={item.title + item.venue}>
                  <a
                    className="clay-panel group flex h-full items-start gap-4 p-4 hover:text-acid"
                    href={item.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EventPoster poster={item.poster} title={item.title} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{item.title}</span>
                      <span className="mt-1 block text-sm text-concrete">
                        {item.venue} · {provinceBySlug.get(item.province)?.name_th} ·{" "}
                        {venueKindByName[item.venue] ? venueKinds[venueKindByName[item.venue]] : "อีเวนต์ / พื้นที่ศิลปะ"}
                        {item.date && (
                          <>
                            {" "}
                            ·{" "}
                            <time dateTime={item.date}>
                              {dateLabel.format(new Date(item.date + "T12:00:00+07:00"))}
                            </time>
                            {item.endDate && (
                              <>
                                {" – "}
                                <time dateTime={item.endDate}>
                                  {dateLabel.format(new Date(item.endDate + "T12:00:00+07:00"))}
                                </time>
                              </>
                            )}
                          </>
                        )}
                      </span>
                      {item.genres.length > 0 && (
                        <span className="mt-1 block text-xs text-concrete">
                          {item.genres.map((key) => t(sceneGenres[key])).join(" · ")}
                        </span>
                      )}
                    </span>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      {matchesVenues.length > 0 && (
        <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold"><Localized text="แผนที่ซีนดนตรีกรุงเทพ" /></h2>
              <p className="mt-1 text-sm text-concrete"><Localized text="คลับ บาร์ Live House และพื้นที่จัดงานที่มีเวทีดนตรีหรือกิจกรรมซีน" /></p>
            </div>
            <span className="text-xs text-concrete">{matchesVenues.length} <Localized text="แห่ง" /> · <Localized text="ตรวจข้อมูลจากแหล่งของเวที ก่อนออกเดินทาง" /></span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matchesVenues.map((venue) => (
              <li key={venue.name}>
                <a
                  className="clay-panel group flex h-full min-h-36 flex-col justify-between gap-4 p-5 hover:-translate-y-0.5 hover:text-acid"
                  href={venue.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-bold">{venue.name}</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
                    </span>
                    <span className="mt-2 block text-sm text-concrete">
                      {t(venueKinds[venue.kind])} · {venue.area}
                    </span>
                  </span>
                  <span className="text-xs text-concrete">{venue.genres.map((key) => t(sceneGenres[key])).join(" · ")}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

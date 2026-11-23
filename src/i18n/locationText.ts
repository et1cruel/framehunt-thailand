import { categoryBySlug, moodBySlug } from "@/data/taxonomy";

function moodInEnglish(label: string) {
  return [...moodBySlug.values()].find((mood) => mood.name_th === label)?.name_en ?? label;
}

function categoryInEnglish(label: string) {
  return [...categoryBySlug.values()].find((category) => category.name_th === label)?.name_en ?? label;
}

export function localizeVibeReason(reason: string, language: "th" | "en") {
  if (language === "th") return reason;

  const moodScore = reason.match(/^คะแนน Mood “(.+?)” สูงถึง (\d+)%$/u);
  if (moodScore) return `Strong ${moodInEnglish(moodScore[1])} mood match: ${moodScore[2]}%`;

  const distance = reason.match(/^ห่างจากคุณประมาณ (\d+) กม\.$/u);
  if (distance) return `About ${distance[1]} km away`;

  const similarMood = reason.match(/^บรรยากาศใกล้เคียง: (.+)$/u);
  if (similarMood) return `Similar atmosphere: ${moodInEnglish(similarMood[1])}`;

  const environment = reason.match(/^สภาพแวดล้อมแบบ(.+)$/u);
  if (environment) return `${categoryInEnglish(environment[1])} setting`;

  const photos = reason.match(/^(\d+) ภาพที่ตรวจสอบแล้ว$/u);
  if (photos) return `${photos[1]} reviewed photos`;

  return reason;
}

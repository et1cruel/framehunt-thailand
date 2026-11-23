import provinceData from "@/data/provinces.json";

const provinceNames = new Map(
  provinceData.provinces.map((province) => [province.name_th, province.name_en]),
);

export function provinceLabel(name: string, language: "th" | "en") {
  return language === "en" ? provinceNames.get(name) ?? name : name;
}

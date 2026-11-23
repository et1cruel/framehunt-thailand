import { Localized, useLanguage } from "@/i18n/Language";
import { Select } from "@/components/ui";
import { searchRadii } from "@/data/types";

export function RadiusSelect({
  radiusKm,
  onChange,
}: {
  radiusKm: number | null;
  onChange: (radiusKm: number | null) => void;
}) {
  const { t } = useLanguage();
  return (
    <Select
      aria-label={t("รัศมีจากตำแหน่งของฉัน")}
      value={radiusKm ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      className="h-10 w-auto"
    >
      <option value=""><Localized text={"ทุกระยะทาง"} /></option>
      {searchRadii.map((radius) => (
        <option key={radius} value={radius}>
          <Localized text={"ภายใน"} /> {radius} <Localized text={"กม."} /></option>
      ))}
    </Select>
  );
}

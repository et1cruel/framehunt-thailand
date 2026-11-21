import { Select } from "@/components/ui";
import { searchRadii } from "@/data/types";

export function RadiusSelect({
  radiusKm,
  onChange,
}: {
  radiusKm: number | null;
  onChange: (radiusKm: number | null) => void;
}) {
  return (
    <Select
      aria-label="รัศมีจากตำแหน่งของฉัน"
      value={radiusKm ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      className="h-10 w-auto"
    >
      <option value="">ทุกระยะทาง</option>
      {searchRadii.map((radius) => (
        <option key={radius} value={radius}>
          ภายใน {radius} กม.
        </option>
      ))}
    </Select>
  );
}

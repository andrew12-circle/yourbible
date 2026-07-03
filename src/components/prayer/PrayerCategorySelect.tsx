import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRAYER_CATEGORIES, PRAYER_CATEGORY_LABELS } from "@/lib/prayer/categories";
import type { PrayerCategory } from "@/lib/prayer/types";

export default function PrayerCategorySelect({
  value,
  onChange,
}: {
  value: PrayerCategory;
  onChange: (v: PrayerCategory) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PrayerCategory)}>
      <SelectTrigger>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {PRAYER_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {PRAYER_CATEGORY_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

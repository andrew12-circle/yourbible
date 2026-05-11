import { Frown, Meh, Smile, Laugh, Angry } from "lucide-react";

const moods = [
  { value: -2, label: "Awful",  Icon: Angry, color: "text-red-600" },
  { value: -1, label: "Down",   Icon: Frown, color: "text-orange-500" },
  { value:  0, label: "Okay",   Icon: Meh,   color: "text-zinc-500" },
  { value:  1, label: "Good",   Icon: Smile, color: "text-emerald-500" },
  { value:  2, label: "Great",  Icon: Laugh, color: "text-violet-500" },
];

export function MoodPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {moods.map((m) => {
        const active = value === m.value;
        const Icon = m.Icon;
        return (
          <button
            type="button"
            key={m.value}
            onClick={() => onChange(active ? null : m.value)}
            title={m.label}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
              active
                ? "border-foreground bg-foreground/5 scale-110"
                : "border-border hover:bg-muted"
            } ${m.color}`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}

export function moodMeta(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return moods.find((m) => m.value === value) ?? null;
}
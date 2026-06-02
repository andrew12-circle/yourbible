import { Layers } from "lucide-react";
import { ALL_ENTRIES_ACCENT, ALL_ENTRIES_TINT } from "@/components/journal/overview/overviewConstants";

interface Props {
  large?: boolean;
  inverted?: boolean;
}

export default function AllEntriesIdentity({ large, inverted }: Props) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center justify-center rounded-2xl shadow-sm ${
          large ? "w-16 h-16" : "w-12 h-12"
        }`}
        style={{
          background: inverted ? "hsl(0 0% 100% / 0.2)" : ALL_ENTRIES_TINT,
        }}
      >
        <Layers
          className={large ? "w-8 h-8" : "w-6 h-6"}
          style={{ color: inverted ? "white" : ALL_ENTRIES_ACCENT }}
          strokeWidth={1.75}
        />
      </div>
      <div>
        <h1
          className={`font-bold tracking-tight ${
            large ? "text-4xl sm:text-[42px]" : "text-2xl"
          } ${inverted ? "text-white" : "text-foreground"}`}
        >
          All Entries
        </h1>
      </div>
    </div>
  );
}

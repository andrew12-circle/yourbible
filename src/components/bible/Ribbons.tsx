import { motion } from "framer-motion";
import { RIBBON_COLORS } from "@/lib/bible/palettes";

export interface RibbonData {
  position: 1 | 2 | 3;
  color: "red" | "gold" | "blue";
  label: string;
  book: string;
  chapter: number;
  verse?: number | null;
}

interface Props {
  ribbons: RibbonData[];
  /** When true, slight sway on scroll */
  swaying?: boolean;
  onJump: (r: RibbonData) => void;
  onAddAt: (position: 1 | 2 | 3) => void;
}

export function Ribbons({ ribbons, swaying, onJump, onAddAt }: Props) {
  const slots: (1 | 2 | 3)[] = [1, 2, 3];
  return (
    <div className="absolute top-0 left-0 right-0 h-0 z-20 pointer-events-none">
      {slots.map((slot) => {
        const r = ribbons.find(x => x.position === slot);
        const colorMeta = RIBBON_COLORS.find(c => c.id === (r?.color ?? "gold"))!;
        // Spread ribbons across the page top
        const leftPct = 18 + (slot - 1) * 28;
        return (
          <motion.button
            key={slot}
            onClick={() => r ? onJump(r) : onAddAt(slot)}
            animate={swaying ? { rotate: [-1, 1.5, -1] } : { rotate: 0 }}
            transition={swaying ? { repeat: Infinity, duration: 6 + slot, ease: "easeInOut" } : { duration: 0.4 }}
            style={{ left: `${leftPct}%`, originY: 0, transformOrigin: "top center" }}
            className="absolute top-0 pointer-events-auto group"
            aria-label={r ? `Jump to ${r.label}` : `Add ribbon ${slot}`}
          >
            <div
              className="w-3 h-24 rounded-b-sm shadow-md transition-all group-hover:h-28"
              style={{
                background: r
                  ? `linear-gradient(180deg, ${colorMeta.hex}, ${colorMeta.hex}dd 70%, ${colorMeta.hex}88)`
                  : "linear-gradient(180deg, hsl(var(--paper-edge)), hsl(var(--paper-deep) / 0.4))",
                opacity: r ? 1 : 0.45,
              }}
            />
            <div
              className="w-3 h-2 -mt-px"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                background: r ? colorMeta.hex : "hsl(var(--paper-edge))",
                opacity: r ? 1 : 0.45,
              }}
            />
            {r && (
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] bg-leather text-paper px-2 py-0.5 rounded">
                {r.label}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

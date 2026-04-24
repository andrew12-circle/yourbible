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

/**
 * Spine ribbons — anchored at the top of the spine, draping down the gutter.
 * Designed to render INSIDE BookScene's spine area (it positions itself
 * absolutely to the parent's center).
 */
export function Ribbons({ ribbons, swaying, onJump, onAddAt }: Props) {
  const slots: (1 | 2 | 3)[] = [1, 2, 3];
  return (
    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-16 z-[3] pointer-events-none">
      {slots.map((slot) => {
        const r = ribbons.find((x) => x.position === slot);
        const colorMeta = RIBBON_COLORS.find(
          (c) => c.id === (r?.color ?? "gold"),
        )!;
        // Stagger ribbons across the spine
        const offset = (slot - 2) * 8; // -8, 0, +8 px
        const heightPct = 78 + slot * 5;
        return (
          <motion.button
            key={slot}
            onClick={() => (r ? onJump(r) : onAddAt(slot))}
            animate={swaying ? { rotate: [-0.5, 0.7, -0.5] } : { rotate: 0 }}
            transition={
              swaying
                ? { repeat: Infinity, duration: 6 + slot, ease: "easeInOut" }
                : { duration: 0.5 }
            }
            style={{
              left: `calc(50% + ${offset}px)`,
              transform: "translateX(-50%)",
              transformOrigin: "top center",
              height: `${heightPct}%`,
            }}
            className="absolute top-0 pointer-events-auto group flex flex-col items-center"
            aria-label={r ? `Jump to ${r.label}` : `Add ribbon ${slot}`}
          >
            <div
              className="w-[6px] sm:w-[7px] flex-1 transition-all group-hover:w-[9px]"
              style={{
                background: r
                  ? `linear-gradient(180deg, ${colorMeta.hex} 0%, ${colorMeta.hex}ee 50%, ${colorMeta.hex}cc 100%)`
                  : "linear-gradient(180deg, hsl(var(--paper-edge)), hsl(var(--paper-deep) / 0.4))",
                opacity: r ? 1 : 0.3,
                boxShadow: r
                  ? `inset 1px 0 0 ${colorMeta.hex}88, inset -1px 0 0 rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.3)`
                  : undefined,
              }}
            />
            <div
              className="w-[6px] sm:w-[7px] h-[6px]"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                background: r ? colorMeta.hex : "hsl(var(--paper-edge))",
                opacity: r ? 1 : 0.3,
              }}
            />
            {r && (
              <div className="absolute top-2 left-full ml-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-[10px] bg-leather text-paper px-2 py-0.5 rounded shadow">
                {r.label}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

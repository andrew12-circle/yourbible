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
 * Ribbon bookmarks attached at the very top of the page (above the spine on the
 * left) and draping down the full height of the viewport — like real Bible
 * ribbons. They sway gently on scroll.
 */
export function Ribbons({ ribbons, swaying, onJump, onAddAt }: Props) {
  const slots: (1 | 2 | 3)[] = [1, 2, 3];
  return (
    <div className="fixed top-0 bottom-0 left-0 w-24 sm:w-28 z-20 pointer-events-none">
      {slots.map((slot) => {
        const r = ribbons.find((x) => x.position === slot);
        const colorMeta = RIBBON_COLORS.find(
          (c) => c.id === (r?.color ?? "gold"),
        )!;
        // Stagger ribbons across the left margin
        const leftPx = 12 + (slot - 1) * 18;
        // Each ribbon a slightly different length so they overlap naturally
        const heightVh = 70 + slot * 8;
        return (
          <motion.button
            key={slot}
            onClick={() => (r ? onJump(r) : onAddAt(slot))}
            animate={
              swaying ? { rotate: [-0.6, 0.8, -0.6] } : { rotate: 0 }
            }
            transition={
              swaying
                ? {
                    repeat: Infinity,
                    duration: 6 + slot,
                    ease: "easeInOut",
                  }
                : { duration: 0.5 }
            }
            style={{
              left: `${leftPx}px`,
              transformOrigin: "top center",
              height: `${heightVh}vh`,
            }}
            className="absolute top-0 pointer-events-auto group flex flex-col items-center"
            aria-label={r ? `Jump to ${r.label}` : `Add ribbon ${slot}`}
          >
            {/* Ribbon body — full length down the page */}
            <div
              className="w-2.5 sm:w-3 flex-1 shadow-[0_2px_4px_rgba(0,0,0,0.15)] transition-all group-hover:w-4"
              style={{
                background: r
                  ? `linear-gradient(180deg, ${colorMeta.hex} 0%, ${colorMeta.hex}ee 50%, ${colorMeta.hex}cc 100%)`
                  : "linear-gradient(180deg, hsl(var(--paper-edge)), hsl(var(--paper-deep) / 0.4))",
                opacity: r ? 1 : 0.35,
                // Subtle satin sheen
                boxShadow: r
                  ? `inset 1px 0 0 ${colorMeta.hex}88, inset -1px 0 0 rgba(0,0,0,0.18)`
                  : undefined,
              }}
            />
            {/* Forked tail */}
            <div
              className="w-2.5 sm:w-3 h-3"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)",
                background: r ? colorMeta.hex : "hsl(var(--paper-edge))",
                opacity: r ? 1 : 0.35,
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

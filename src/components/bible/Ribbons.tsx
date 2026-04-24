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
    // Allow ribbons to overflow the page block downward (beyond the cover)
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 z-[6] pointer-events-none" style={{ height: "calc(100% + 56px)" }}>
      {slots.map((slot) => {
        const r = ribbons.find((x) => x.position === slot);
        const colorMeta = RIBBON_COLORS.find(
          (c) => c.id === (r?.color ?? "gold"),
        )!;
        // Stagger ribbons across the spine, give each a slight unique tilt + length
        const offset = (slot - 2) * 7 + (slot === 2 ? 1 : 0); // -7, +1, +7
        const baseTilt = [-1.6, 0.9, -0.4][slot - 1]; // gentle uneven hang
        // Each ribbon overshoots the bottom of the book by a different amount
        const overshoot = [38, 28, 46][slot - 1];
        return (
          <motion.button
            key={slot}
            onClick={() => (r ? onJump(r) : onAddAt(slot))}
            animate={
              swaying
                ? { rotate: [baseTilt - 0.6, baseTilt + 0.8, baseTilt - 0.6] }
                : { rotate: baseTilt }
            }
            transition={
              swaying
                ? { repeat: Infinity, duration: 6 + slot, ease: "easeInOut" }
                : { duration: 0.7, ease: "easeInOut" }
            }
            style={{
              left: `calc(50% + ${offset}px)`,
              transform: `translateX(-50%) rotate(${baseTilt}deg)`,
              transformOrigin: "top center",
              // body length = full page height + overshoot beyond the cover
              height: `calc(100% + ${overshoot}px)`,
            }}
            className="absolute top-[-2px] pointer-events-auto group flex flex-col items-center"
            aria-label={r ? `Jump to ${r.label}` : `Add ribbon ${slot}`}
          >
            {/* Ribbon body — satin sheen, fiber striations, soft drop shadow */}
            <div
              className="w-[7px] sm:w-[8px] flex-1 transition-all group-hover:w-[10px]"
              style={{
                backgroundImage: r
                  ? // satin sheen across the width
                    `linear-gradient(90deg, ${colorMeta.hex}55 0%, ${colorMeta.hex} 22%, #ffffff33 48%, ${colorMeta.hex} 72%, ${colorMeta.hex}66 100%),` +
                    // fine vertical fiber striations
                    `repeating-linear-gradient(180deg, rgba(0,0,0,0.10) 0 0.6px, transparent 0.6px 1.6px),` +
                    // length-wise tone variance
                    `linear-gradient(180deg, ${colorMeta.hex} 0%, ${colorMeta.hex}dd 60%, ${colorMeta.hex}aa 100%)`
                  : "linear-gradient(180deg, hsl(var(--paper-edge)), hsl(var(--paper-deep) / 0.4))",
                backgroundBlendMode: r ? "overlay, multiply, normal" : "normal",
                opacity: r ? 1 : 0.3,
                boxShadow: r
                  ? `inset 1px 0 0 rgba(255,255,255,0.35), inset -1px 0 0 rgba(0,0,0,0.35), 1px 2px 6px rgba(0,0,0,0.55), 0 0 0.5px rgba(0,0,0,0.6)`
                  : undefined,
                borderRadius: "1px",
              }}
            />
            {/* Frayed angled tip — diagonal cut typical of bookmark ribbons */}
            <div
              className="w-[7px] sm:w-[8px] h-[10px]"
              style={{
                clipPath:
                  slot % 2 === 0
                    ? "polygon(0 0, 100% 0, 100% 60%, 0 100%)"
                    : "polygon(0 0, 100% 0, 0 60%, 100% 100%)",
                background: r
                  ? `linear-gradient(180deg, ${colorMeta.hex} 0%, ${colorMeta.hex}99 100%)`
                  : "hsl(var(--paper-edge))",
                opacity: r ? 1 : 0.3,
                boxShadow: r ? "1px 2px 4px rgba(0,0,0,0.5)" : undefined,
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

import { PageStackEdge } from "@/components/bible/PageStackEdge";
import { COVER_LEATHER, RIBBON_COLORS, coverLeatherStyle } from "@/lib/bible/palettes";
import { cn } from "@/lib/utils";

const DECOR_RIBBONS = [
  { color: RIBBON_COLORS.find((c) => c.id === "red")!.hex, offset: 8 },
  { color: RIBBON_COLORS.find((c) => c.id === "blue")!.hex, offset: 15 },
  { color: RIBBON_COLORS.find((c) => c.id === "gold")!.hex, offset: 22 },
] as const;

export default function PrayerBibleCardFrame({
  children,
  className,
  contentClassName,
}: {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn("prayer-bible-card leather-cover-surface", className)}
      style={coverLeatherStyle(COVER_LEATHER.cordovan)}
    >
      <div className="prayer-bible-card__frame">
        <div className="prayer-bible-card__paper paper-texture">
          <PageStackEdge side="left" widthPx={12} />
          <div className="prayer-bible-card__ribbons" aria-hidden>
            {DECOR_RIBBONS.map(({ color, offset }, index) => (
              <span
                key={index}
                className="prayer-bible-card__ribbon"
                style={{
                  right: offset,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}dd 72%, ${color}99 100%)`,
                }}
              />
            ))}
          </div>
          <div className={cn("prayer-bible-card__content", contentClassName)}>{children}</div>
        </div>
      </div>
    </div>
  );
}

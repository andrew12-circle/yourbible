import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IosAppIconProps = {
  icon: LucideIcon;
  background: string;
  iconColor?: string;
  size?: "grid" | "dock";
  /** Overrides preset Tailwind sizes (e.g. mini phone scaled to device width). */
  pixelSize?: number;
  imageSrc?: string;
  className?: string;
};

export function IosAppIcon({
  icon: Icon,
  background,
  iconColor = "#FFFFFF",
  size = "grid",
  pixelSize,
  imageSrc,
  className,
}: IosAppIconProps) {
  const isDock = size === "dock";
  const glyphScale = pixelSize ? pixelSize / (isDock ? 50 : 60) : 1;
  const glyphPx = pixelSize
    ? Math.round((isDock ? 26 : 30) * glyphScale)
    : undefined;

  return (
    <div
      className={cn(
        "ios-icon flex items-center justify-center",
        !pixelSize &&
          (isDock
            ? "ios-icon-dock w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]"
            : "w-[52px] h-[52px] sm:w-[60px] sm:h-[60px]"),
        className,
      )}
      style={{
        background,
        ...(pixelSize ? { width: pixelSize, height: pixelSize } : undefined),
      }}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Icon
          className={cn("relative z-[1] shrink-0", !glyphPx && (isDock ? "h-[22px] w-[22px] sm:h-[26px] sm:w-[26px]" : "h-[26px] w-[26px] sm:h-[30px] sm:w-[30px]"))}
          style={glyphPx ? { width: glyphPx, height: glyphPx } : undefined}
          color={iconColor}
          strokeWidth={2.25}
          absoluteStrokeWidth
        />
      )}
    </div>
  );
}

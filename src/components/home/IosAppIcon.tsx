import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IosAppIconProps = {
  icon: LucideIcon;
  background: string;
  iconColor?: string;
  size?: "grid" | "dock";
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
  const glyphPx = pixelSize ? Math.round((isDock ? 25 : 29) * glyphScale) : undefined;

  return (
    <div
      className={cn(
        "ios-icon flex items-center justify-center",
        !pixelSize && (isDock ? "ios-icon-dock w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]" : "w-[60px] h-[60px]"),
        className,
      )}
      style={{ background, ...(pixelSize ? { width: pixelSize, height: pixelSize } : undefined) }}
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="ios-icon-glyph-plate" aria-hidden="true" />
          <Icon
            className={cn("relative z-[1] shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)]", !glyphPx && (isDock ? "h-[22px] w-[22px] sm:h-[25px] sm:w-[25px]" : "h-[29px] w-[29px]"))}
            style={glyphPx ? { width: glyphPx, height: glyphPx } : undefined}
            color={iconColor}
            strokeWidth={2.05}
            absoluteStrokeWidth
          />
        </>
      )}
    </div>
  );
}

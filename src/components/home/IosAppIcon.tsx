import { useState } from "react";
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
  const [failedImage, setFailedImage] = useState<string>();
  const isDock = size === "dock";
  const explicitSize = pixelSize && Number.isFinite(pixelSize) && pixelSize > 0 ? pixelSize : undefined;
  const preset = !explicitSize && (isDock ? "w-[44px] h-[44px] sm:w-[50px] sm:h-[50px]" : "w-[60px] h-[60px]");
  const dimensions = explicitSize ? { width: explicitSize, height: explicitSize } : undefined;

  // The approved images already contain the material, corners, lighting and depth.
  // A plain image branch prevents the old tile overlays from tinting the artwork,
  // and object-contain preserves details such as the Bible's red bookmark.
  if (imageSrc && failedImage !== imageSrc) {
    return (
      <span
        className={cn("relative block shrink-0", preset, className)}
        style={dimensions}
        data-app-icon-renderer="artwork"
        aria-hidden="true"
      >
        <img
          src={imageSrc}
          alt=""
          width={160}
          height={160}
          draggable={false}
          decoding="async"
          className="block h-full w-full select-none object-contain"
          onError={() => setFailedImage(imageSrc)}
        />
      </span>
    );
  }

  const glyphPx = explicitSize ? Math.round(explicitSize * (isDock ? 0.5 : 29 / 60)) : undefined;
  return (
    <div
      className={cn("ios-icon flex shrink-0 items-center justify-center", preset, isDock && "ios-icon-dock", className)}
      style={{ background, ...dimensions }}
      data-app-icon-renderer="fallback"
      aria-hidden="true"
    >
      <span className="ios-icon-glyph-plate" />
      <Icon
        className={cn("relative z-[1] shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.14)]", !glyphPx && (isDock ? "h-[22px] w-[22px] sm:h-[25px] sm:w-[25px]" : "h-[29px] w-[29px]"))}
        style={glyphPx ? { width: glyphPx, height: glyphPx } : undefined}
        color={iconColor}
        strokeWidth={2.05}
        absoluteStrokeWidth
      />
    </div>
  );
}

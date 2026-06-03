import { useId } from "react";
import { cn } from "@/lib/utils";

export type SketchToolIconProps = {
  active?: boolean;
  accentColor?: string;
  className?: string;
};

const SHADOW = "drop-shadow(0 4px 5px rgba(0,0,0,.18))";

function IconSvg({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 32 48"
      fill="none"
      className={cn("block h-full w-full", className)}
      style={{ filter: SHADOW }}
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      {children}
    </svg>
  );
}

/** Apple Pencil — white barrel, tapered cone, metallic nib (tip up). */
export function FinePenIcon({ className }: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const bodyId = `${id}-apBody`;
  const taperId = `${id}-apTaper`;
  const nibId = `${id}-apNib`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={bodyId} x1="10" y1="4" x2="22" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ECECEF" />
          <stop offset="0.45" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#DADADF" />
        </linearGradient>
        <linearGradient id={taperId} x1="11" y1="22" x2="21" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FAFAFC" />
          <stop offset="1" stopColor="#EBEBF0" />
        </linearGradient>
        <linearGradient id={nibId} x1="14" y1="38" x2="18" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="#B8B8BE" />
          <stop offset="0.35" stopColor="#F4F4F6" />
          <stop offset="0.65" stopColor="#D8D8DE" />
          <stop offset="1" stopColor="#9E9EA8" />
        </linearGradient>
      </defs>
      <g transform="rotate(180 16 24)">
        <rect x="11" y="4" width="10" height="18" rx="5" fill={`url(#${bodyId})`} />
        <rect x="12.4" y="6" width="1.8" height="14" rx="0.9" fill="#FFFFFF" opacity="0.65" />
        <ellipse cx="16" cy="22" rx="5.2" ry="0.75" fill="#C8C8D0" opacity="0.55" />
        <path d="M11 22.4 H21 L17.8 37.2 H14.2 Z" fill={`url(#${taperId})`} />
        <path d="M11.6 23.2 L14.4 36.4" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.35" strokeLinecap="round" />
        <path d="M14.2 37.2 H17.8 L16 47 Z" fill={`url(#${nibId})`} />
        <path d="M15.1 39.5 L16 45.8" stroke="#FFFFFF" strokeWidth="0.55" opacity="0.75" strokeLinecap="round" />
      </g>
    </IconSvg>
  );
}

export function FountainPenIcon({
  accentColor = "#111827",
  className,
}: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const nibId = `${id}-nib`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={nibId} x1="9" y1="3" x2="23" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D1D5DB" />
          <stop offset=".5" stopColor="#F9FAFB" />
          <stop offset="1" stopColor="#9CA3AF" />
        </linearGradient>
      </defs>
      <path
        d="M16 3C20 10 23 17 23 25C23 30 20 34 16 37C12 34 9 30 9 25C9 17 12 10 16 3Z"
        fill={`url(#${nibId})`}
      />
      <path d="M16 8V30" stroke="#6B7280" strokeWidth="1.2" />
      <circle cx="16" cy="25" r="2" fill="#111827" />
      <rect x="10" y="35" width="12" height="9" rx="3" fill={accentColor} />
      <rect x="10" y="42" width="12" height="3" rx="1.5" fill="white" opacity=".8" />
    </IconSvg>
  );
}

export function MarkerIcon({
  accentColor = "#FF3B30",
  className,
}: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const bodyId = `${id}-markerBody`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={bodyId} x1="8" y1="18" x2="24" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#52525B" />
          <stop offset=".5" stopColor="#18181B" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
      </defs>
      <path d="M9 6H23L21 18H11L9 6Z" fill={accentColor} />
      <path d="M11 18H21L24 43H8L11 18Z" fill={`url(#${bodyId})`} />
      <rect x="8" y="26" width="16" height="5" rx="1.5" fill={accentColor} />
      <path d="M10 43H22L20 47H12L10 43Z" fill="#111" />
    </IconSvg>
  );
}

export function PencilIcon({ className }: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const woodId = `${id}-wood`;
  const bodyId = `${id}-pencilBody`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={woodId} x1="8" y1="3" x2="24" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE68A" />
          <stop offset=".55" stopColor="#FDBA74" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>
        <linearGradient id={bodyId} x1="8" y1="20" x2="24" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3F3F46" />
          <stop offset=".5" stopColor="#18181B" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
      </defs>
      <path d="M16 3L24 20H8L16 3Z" fill={`url(#${woodId})`} />
      <path d="M16 3L19 10H13L16 3Z" fill="#111827" />
      <rect x="8" y="20" width="16" height="25" rx="5" fill={`url(#${bodyId})`} />
      <path d="M13 20V45M19 20V45" stroke="#27272A" strokeWidth="1.2" opacity=".65" />
    </IconSvg>
  );
}

export function HighlighterIcon({ className }: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const gradId = `${id}-highlighter`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={gradId} x1="9" y1="14" x2="23" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset=".5" stopColor="#FACC15" />
          <stop offset="1" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      <path d="M12 5L25 0L23 14H12V5Z" fill="#FACC15" />
      <rect x="9" y="14" width="14" height="28" rx="4" fill={`url(#${gradId})`} />
      <rect x="7" y="36" width="18" height="9" rx="3" fill="#EAB308" />
      <path d="M9 45H23L21 48H11L9 45Z" fill="#B45309" />
    </IconSvg>
  );
}

export function EraserIcon({ className }: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const gradId = `${id}-eraser`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={gradId} x1="9" y1="8" x2="23" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset=".55" stopColor="#F472B6" />
          <stop offset="1" stopColor="#DB2777" />
        </linearGradient>
      </defs>
      <rect x="9" y="8" width="14" height="34" rx="7" fill={`url(#${gradId})`} />
      <rect x="9" y="29" width="14" height="4" fill="#EC4899" opacity=".45" />
      <rect x="12" y="11" width="4" height="24" rx="2" fill="white" opacity=".22" />
    </IconSvg>
  );
}

const RULER_TICKS: { y: number; long: boolean }[] = [
  { y: 9, long: true },
  { y: 14, long: false },
  { y: 19, long: true },
  { y: 24, long: false },
  { y: 29, long: true },
  { y: 34, long: false },
  { y: 39, long: true },
];

export function RulerIcon({ className }: SketchToolIconProps) {
  const id = useId().replace(/:/g, "");
  const gradId = `${id}-ruler`;

  return (
    <IconSvg className={className}>
      <defs>
        <linearGradient id={gradId} x1="13" y1="3" x2="19" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9CA3AF" />
          <stop offset=".5" stopColor="#6B7280" />
          <stop offset="1" stopColor="#374151" />
        </linearGradient>
      </defs>
      <rect x="13" y="3" width="6" height="42" rx="1.5" fill={`url(#${gradId})`} />
      {RULER_TICKS.map(({ y, long }) => (
        <path
          key={y}
          d={`M13 ${y}H${long ? 18 : 15.5}`}
          stroke="white"
          strokeWidth="1.2"
          opacity=".88"
        />
      ))}
    </IconSvg>
  );
}

export function LassoIcon({ className }: SketchToolIconProps) {
  return (
    <IconSvg className={className}>
      <circle
        cx="16"
        cy="26"
        r="11.5"
        stroke="#374151"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeDasharray="4.5 3.5"
      />
    </IconSvg>
  );
}

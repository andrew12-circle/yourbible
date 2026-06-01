import { useId } from "react";
import type { InkTool } from "@/lib/ink/types";
import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
  active?: boolean;
  /** Toolbar strip vs minimized chip. */
  variant?: "toolbar" | "chip";
};

const sizeClass = {
  toolbar: "h-10 w-[22px]",
  chip: "h-8 w-[18px]",
};

function ToolSvg({
  className,
  variant = "toolbar",
  children,
}: {
  className?: string;
  variant?: "toolbar" | "chip";
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 28 48"
      className={cn(sizeClass[variant], className)}
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      {children}
    </svg>
  );
}

/** Pencil with wood grain + graphite tip. */
export function IconPencil({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-wood`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={active ? "#fcd34d" : "#d4a574"} />
          <stop offset="50%" stopColor={active ? "#fde68a" : "#e8c89a"} />
          <stop offset="100%" stopColor={active ? "#f59e0b" : "#b8956a"} />
        </linearGradient>
        <linearGradient id={`${id}-tip`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <path
        d="M11 4h6v7.5l-1 1.5H12l-1-1.5V4z"
        fill={`url(#${id}-wood)`}
        stroke="#78350f"
        strokeWidth="0.4"
      />
      <path d="M10.5 13 L14 44 L17.5 13 Z" fill={`url(#${id}-tip)`} />
      <path d="M13 14 L14 42 L15 14" stroke="#94a3b8" strokeWidth="0.35" opacity="0.6" />
      <ellipse cx="14" cy="5.5" rx="2.8" ry="1.2" fill={active ? "#fef3c7" : "#fde68a"} />
      <text x="14" y="7.5" textAnchor="middle" fontSize="4.5" fontWeight="700" fill="#422006">
        A
      </text>
    </ToolSvg>
  );
}

/** Fine liner — metal barrel + needle tip. */
export function IconFineline({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={active ? "#e2e8f0" : "#cbd5e1"} />
          <stop offset="50%" stopColor={active ? "#f8fafc" : "#f1f5f9"} />
          <stop offset="100%" stopColor={active ? "#94a3b8" : "#64748b"} />
        </linearGradient>
      </defs>
      <rect x="12.5" y="2" width="3" height="10" rx="1" fill={`url(#${id}-metal)`} />
      <path
        d="M14 12 L13.2 44"
        stroke="#0f172a"
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap="round"
      />
      <circle cx="14" cy="2.5" r="1.8" fill={active ? "#f8fafc" : "#e2e8f0"} stroke="#64748b" strokeWidth="0.4" />
    </ToolSvg>
  );
}

/** Fountain pen — nib, feed, lacquered barrel. */
export function IconFountain({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-barrel`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={active ? "#1e3a5f" : "#0f172a"} />
          <stop offset="40%" stopColor={active ? "#334155" : "#1e293b"} />
          <stop offset="100%" stopColor={active ? "#0f172a" : "#020617"} />
        </linearGradient>
        <linearGradient id={`${id}-nib`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="60%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <ellipse cx="14" cy="5" rx="4" ry="1.8" fill={active ? "#e2e8f0" : "#cbd5e1"} />
      <path d="M10.5 6.5h7v6l-1.2 1.2h-4.6L10.5 12.5V6.5z" fill={`url(#${id}-nib)`} stroke="#64748b" strokeWidth="0.35" />
      <path
        d="M9.5 13.5 Q14 17 18.5 13.5 L17.5 42 L10.5 42 Z"
        fill={`url(#${id}-barrel)`}
      />
      <path d="M13 14 L14 40 L15 14" stroke="#64748b" strokeWidth="0.4" opacity="0.5" />
      <path d="M14 13.5 L14 16" stroke="#f8fafc" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="14" cy="16.5" r="0.6" fill="#38bdf8" opacity="0.8" />
    </ToolSvg>
  );
}

/** Chisel-tip marker. */
export function IconMarker({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={active ? "#f87171" : "#dc2626"} />
          <stop offset="100%" stopColor={active ? "#b91c1c" : "#991b1b"} />
        </linearGradient>
      </defs>
      <path d="M8 10 L20 10 L18.5 42 L9.5 42 Z" fill={`url(#${id}-body)`} />
      <path d="M9 10 L19 10 L18 14 L10 14 Z" fill={active ? "#fecaca" : "#fca5a5"} />
      <rect x="10" y="5" width="8" height="5" rx="1.2" fill={active ? "#ef4444" : "#dc2626"} />
      <path d="M10 14 L18 14 L17.5 16 L10.5 16 Z" fill="#7f1d1d" opacity="0.5" />
    </ToolSvg>
  );
}

/** Wide highlighter — angled chisel + label. */
export function IconHighlighter({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-hi`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={active ? "#fde047" : "#facc15"} />
          <stop offset="100%" stopColor={active ? "#ca8a04" : "#a16207"} />
        </linearGradient>
      </defs>
      <path d="M5 12 L23 11 L21.5 38 L6.5 39 Z" fill={`url(#${id}-hi)`} opacity="0.95" />
      <path d="M6 11 L22 10.5 L21 15 L7 15.5 Z" fill={active ? "#fef08a" : "#fde047"} />
      <rect x="8" y="6" width="12" height="5" rx="1" fill="#854d0e" />
      <text x="14" y="26" textAnchor="middle" fontSize="6" fontWeight="800" fill="#422006">
        80
      </text>
    </ToolSvg>
  );
}

/** Block eraser with sleeve. */
export function IconEraser({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-eraser`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={active ? "#fda4af" : "#fb7185"} />
          <stop offset="100%" stopColor={active ? "#e11d48" : "#f43f5e"} />
        </linearGradient>
      </defs>
      <rect x="7" y="10" width="14" height="20" rx="2" fill={`url(#${id}-eraser)`} />
      <path d="M7 10 L21 10 L20 14 L8 14 Z" fill={active ? "#fff1f2" : "#ffe4e6"} />
      <rect x="8" y="30" width="12" height="8" rx="1.5" fill={active ? "#9f1239" : "#be123c"} />
      <rect x="9" y="32" width="10" height="1" rx="0.5" fill="#fecdd3" opacity="0.6" />
    </ToolSvg>
  );
}

/** Metal ruler with tick marks. */
export function IconRuler({ className, active, variant = "toolbar" }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <ToolSvg className={className} variant={variant}>
      <defs>
        <linearGradient id={`${id}-r`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={active ? "#64748b" : "#475569"} />
          <stop offset="50%" stopColor={active ? "#94a3b8" : "#64748b"} />
          <stop offset="100%" stopColor={active ? "#475569" : "#334155"} />
        </linearGradient>
      </defs>
      <rect
        x="11"
        y="4"
        width="6"
        height="40"
        rx="1"
        fill={`url(#${id}-r)`}
        stroke={active ? "#cbd5e1" : "#94a3b8"}
        strokeWidth="0.5"
      />
      {[10, 16, 22, 28, 34, 40].map((y) => (
        <line
          key={y}
          x1="11"
          x2={y % 12 === 10 ? "15" : "14"}
          y1={y}
          y2={y}
          stroke="#e2e8f0"
          strokeWidth="0.7"
        />
      ))}
    </ToolSvg>
  );
}

export function IconLasso({ className, active, variant = "toolbar" }: IconProps) {
  return (
    <ToolSvg className={className} variant={variant}>
      <path
        d="M9 14 Q7 22 11 30 Q15 36 17 28 Q19 20 15 12 Q11 8 9 14"
        fill="none"
        stroke={active ? "#f8fafc" : "#cbd5e1"}
        strokeWidth="2"
        strokeDasharray="4 2.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="14" r="2" fill={active ? "#38bdf8" : "#94a3b8"} stroke="#f8fafc" strokeWidth="0.5" />
    </ToolSvg>
  );
}

export function IconRainbowSwatch({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" className={cn("h-5 w-5", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-rb`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#eab308" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="75%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill={`url(#${id}-rb)`} stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

const ICON_MAP: Record<
  InkTool,
  React.ComponentType<{ active?: boolean; variant?: "toolbar" | "chip" }>
> = {
  pencil: IconPencil,
  fineline: IconFineline,
  fountain: IconFountain,
  marker: IconMarker,
  highlighter: IconHighlighter,
  eraser: IconEraser,
  ruler: IconRuler,
  lasso: IconLasso,
};

/** Icon for toolbar chip — falls back to fountain for ruler/lasso. */
export function SketchToolIcon({
  tool,
  active = true,
  variant = "toolbar",
  className,
}: {
  tool: InkTool;
  active?: boolean;
  variant?: "toolbar" | "chip";
  className?: string;
}) {
  const resolved =
    tool === "ruler" || tool === "lasso" ? "fountain" : tool;
  const Icon = ICON_MAP[resolved];
  return <Icon active={active} variant={variant} className={className} />;
}

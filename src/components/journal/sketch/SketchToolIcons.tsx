import { cn } from "@/lib/utils";

type IconProps = { className?: string; active?: boolean };

/** Skeuomorphic tool icons inspired by Apple Markup. */
export function IconPencil({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <rect x="9" y="2" width="6" height="8" rx="1" fill={active ? "#94a3b8" : "#64748b"} />
      <path d="M8 10 L12 38 L16 10 Z" fill={active ? "#e2e8f0" : "#cbd5e1"} />
      <path d="M10 10 L12 36 L14 10" fill={active ? "#475569" : "#334155"} />
      <text x="12" y="8" textAnchor="middle" fontSize="5" fontWeight="700" fill="#0f172a">A</text>
    </svg>
  );
}

export function IconFineline({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <path
        d="M12 4 L11 36"
        stroke={active ? "#f8fafc" : "#e2e8f0"}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="3" r="2" fill={active ? "#f8fafc" : "#cbd5e1"} />
    </svg>
  );
}

export function IconFountain({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <path d="M10 6 L14 6 L13 14 L11 14 Z" fill={active ? "#cbd5e1" : "#94a3b8"} />
      <path d="M9 14 Q12 18 15 14 L14 36 L10 36 Z" fill={active ? "#1e293b" : "#0f172a"} />
      <ellipse cx="12" cy="5" rx="3" ry="1.5" fill={active ? "#f1f5f9" : "#e2e8f0"} />
      <path d="M11 14 L12 34 L13 14" stroke={active ? "#64748b" : "#475569"} strokeWidth="0.5" />
    </svg>
  );
}

export function IconMarker({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <path d="M7 8 L17 8 L16 36 L8 36 Z" fill={active ? "#dc2626" : "#b91c1c"} />
      <rect x="8" y="4" width="8" height="5" rx="1" fill={active ? "#fca5a5" : "#f87171"} />
    </svg>
  );
}

export function IconHighlighter({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <path d="M6 10 L18 10 L17 34 L7 34 Z" fill={active ? "#facc15" : "#eab308"} opacity="0.9" />
      <rect x="7" y="6" width="10" height="5" rx="1" fill="#ca8a04" />
      <text x="12" y="24" textAnchor="middle" fontSize="7" fontWeight="700" fill="#713f12">80</text>
    </svg>
  );
}

export function IconEraser({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <rect x="6" y="8" width="12" height="22" rx="2" fill={active ? "#fda4af" : "#fb7185"} />
      <rect x="7" y="30" width="10" height="6" rx="1" fill={active ? "#9f1239" : "#be123c"} />
      <path d="M6 8 L18 8 L17 12 L7 12 Z" fill={active ? "#ffe4e6" : "#fecdd3"} />
    </svg>
  );
}

export function IconRuler({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <rect
        x="10"
        y="4"
        width="4"
        height="32"
        rx="1"
        fill={active ? "#475569" : "#334155"}
        stroke={active ? "#94a3b8" : "#64748b"}
        strokeWidth="0.5"
      />
      {[8, 14, 20, 26, 32].map((y) => (
        <line key={y} x1="10" x2="13" y1={y} y2={y} stroke="#cbd5e1" strokeWidth="0.8" />
      ))}
    </svg>
  );
}

export function IconLasso({ className, active }: IconProps) {
  return (
    <svg viewBox="0 0 24 40" className={cn("h-9 w-5", className)} aria-hidden>
      <path
        d="M8 12 Q6 20 10 28 Q14 34 16 26 Q18 18 14 10 Q10 6 8 12"
        fill="none"
        stroke={active ? "#f8fafc" : "#cbd5e1"}
        strokeWidth="1.8"
        strokeDasharray="3 2"
      />
      <circle cx="8" cy="12" r="1.5" fill={active ? "#f8fafc" : "#e2e8f0"} />
    </svg>
  );
}

export function IconRainbowSwatch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-6 w-6", className)} aria-hidden>
      <defs>
        <linearGradient id="sketch-rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="25%" stopColor="#eab308" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="75%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#sketch-rainbow)" />
    </svg>
  );
}

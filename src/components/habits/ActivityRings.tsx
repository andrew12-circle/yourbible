import { cn } from "@/lib/utils";

export type RingValues = {
  move: number;
  exercise: number;
  stand: number;
};

type Props = {
  values: RingValues;
  size?: number;
  className?: string;
};

const RINGS = [
  { key: "move" as const, color: "#FA114F", track: "rgba(250,17,79,0.2)", width: 10, inset: 0 },
  { key: "exercise" as const, color: "#92E82A", track: "rgba(146,232,42,0.2)", width: 10, inset: 14 },
  { key: "stand" as const, color: "#00D4FF", track: "rgba(0,212,255,0.2)", width: 10, inset: 28 },
];

export function ActivityRings({ values, size = 140, className }: Props) {
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Activity rings: today ${values.move}%, week ${values.exercise}%, month ${values.stand}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {RINGS.map((ring) => {
          const r = (size - ring.inset * 2 - ring.width) / 2;
          const circumference = 2 * Math.PI * r;
          const pct = Math.min(100, Math.max(0, values[ring.key]));
          const offset = circumference - (pct / 100) * circumference;

          return (
            <g key={ring.key}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={ring.track}
                strokeWidth={ring.width}
              />
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke={ring.color}
                strokeWidth={ring.width}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

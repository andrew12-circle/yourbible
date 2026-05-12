import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Grid3x3 } from "lucide-react";
import { LIFE_WEEKS_TOTAL, computeLifeWeekIndex } from "@/lib/lifeWeeks";

/**
 * Compact home summary + 52-cell strip for the current year-of-life row (week columns).
 */
export function LifeWeeksTile() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => Date.now());
  const dobRaw = profile?.date_of_birth;
  const dob = dobRaw != null && String(dobRaw).trim() !== "" ? String(dobRaw).trim() : null;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    if (!dob) return null;
    return computeLifeWeekIndex(dob, now);
  }, [dob, now]);

  const weeksLived = stats ? stats.currentWeekIndex + 1 : 0;
  const weeksRemaining = stats ? Math.max(0, LIFE_WEEKS_TOTAL - weeksLived) : LIFE_WEEKS_TOTAL;
  const weekCol = stats ? stats.currentWeekIndex % 52 : 0;

  return (
    <button
      type="button"
      onClick={() => navigate("/life-weeks")}
      className="w-full text-left mb-4 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
      aria-label={dob ? "Open my life in weeks" : "Set birthdate for life in weeks"}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-800 mb-1.5">
        <Grid3x3 className="w-3.5 h-3.5" /> My life in weeks
      </div>

      {!dob && (
        <p className="text-[15px] font-medium leading-snug text-zinc-900">
          Set your birthdate to see weeks lived and a full poster grid.
        </p>
      )}

      {dob && !stats && (
        <p className="text-[15px] font-medium leading-snug text-zinc-900">Open to verify your birth date.</p>
      )}

      {dob && stats && (
        <>
          <p className="text-[15px] font-medium leading-snug text-zinc-900 tabular-nums">
            <span className="font-semibold">{weeksLived.toLocaleString()} weeks</span> lived ·{" "}
            <span className="font-semibold">{weeksRemaining.toLocaleString()}</span> remaining
          </p>
          <div className="mt-3 flex gap-0.5 w-full" aria-hidden>
            {Array.from({ length: 52 }, (_, c) => (
              <div
                key={c}
                className={`h-1.5 min-w-0 flex-1 rounded-[1px] ${
                  c <= weekCol ? "bg-zinc-900" : "border border-zinc-400/90 bg-transparent"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </button>
  );
}

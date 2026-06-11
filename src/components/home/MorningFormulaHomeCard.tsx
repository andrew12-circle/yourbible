import { useNavigate } from "react-router-dom";
import { ChevronRight, Sunrise } from "lucide-react";

/** Prominent entry on the home widgets page — morning review + workbook. */
export function MorningFormulaHomeCard() {
  const navigate = useNavigate();
  const isMorning = new Date().getHours() < 12;

  return (
    <button
      type="button"
      onClick={() => navigate("/living-hope/review")}
      className="w-full flex items-center gap-3 p-4 mb-3 rounded-[22px] bg-gradient-to-br from-amber-500/90 to-orange-600/90 backdrop-blur-2xl border border-white/40 shadow-[0_10px_30px_-12px_rgba(180,83,9,0.55)] active:scale-[0.985] transition text-left"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Sunrise className="h-6 w-6 text-white" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">Morning formula</p>
        <p className="text-[15px] font-semibold text-white leading-snug">
          {isMorning ? "Start today's review" : "Review your vision"}
        </p>
        <p className="text-[12px] text-white/75 mt-0.5">Worship · scripture · pray · assign · execute</p>
      </div>
      <ChevronRight className="w-5 h-5 text-white/70 shrink-0" aria-hidden />
    </button>
  );
}

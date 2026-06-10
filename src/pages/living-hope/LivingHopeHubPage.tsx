import { Link, Navigate } from "react-router-dom";
import {
  ChevronRight,
  Loader2,
  Mail,
  PenLine,
  Sparkles,
  Sunrise,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { useLivingHope } from "@/hooks/useLivingHope";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { formatUnlockLabel, isLetterUnlockable } from "@/lib/livingHope/letterSections";
import { WORKBOOK_SECTIONS } from "@/lib/livingHope/workbookTypes";
import { cn } from "@/lib/utils";

export default function LivingHopeHubPage() {
  const { user, loading } = useAuth();
  const { busy, letter, goals, todayReview, streak } = useLivingHope(user?.id);
  const { busy: wbBusy, workbook } = useLivingHopeWorkbook(user?.id);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const letterStatus = letter?.status ?? "draft";
  const canOpen = letter?.unlock_at && isLetterUnlockable(letter.unlock_at);
  const reviewedToday = !!todayReview;
  const loadingAll = busy || wbBusy;

  return (
    <LivingHopeChrome backTo="/home" subtitle={`${greeting} — never look backwards. The future is in front.`}>
      {loadingAll ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 py-2 overflow-y-auto scrollbar-hide">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15">
                <Sunrise className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-lg tracking-tight text-white">Morning formula</h1>
                <p className="mt-0.5 text-[12px] text-white/55 leading-relaxed">
                  Manifesto → vision → story → goals → surrender. See it before it arrives.
                </p>
                {streak > 0 ? (
                  <p className="mt-1.5 text-[11px] text-amber-200/80">{streak}-day streak</p>
                ) : null}
              </div>
            </div>
            <Link to="/living-hope/review" className="block mt-3">
              <Button
                className={cn(
                  "w-full rounded-xl h-10 font-medium text-sm",
                  reviewedToday
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "bg-amber-400 text-amber-950 hover:bg-amber-300",
                )}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {reviewedToday ? "Review again" : "Start morning review"}
              </Button>
            </Link>
          </section>

          {workbook?.vision_headline ? (
            <section className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-amber-300/60 mb-1">Vision</p>
              <p className="text-[13px] text-white/80 leading-snug line-clamp-3">{workbook.vision_headline}</p>
              {workbook.income_total_label ? (
                <p className="text-[12px] text-amber-200/70 mt-1">{workbook.income_total_label}</p>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-white/50" />
              <h2 className="text-[14px] font-medium text-white">Letter from the future</h2>
            </div>
            <p className="text-[12px] text-white/55 leading-relaxed">
              {letterStatus === "draft" && "Write your 2-year letter — the full story of who you became."}
              {letterStatus === "sealed" && !canOpen && `Sealed until ${formatUnlockLabel(letter?.unlock_at ?? null)}.`}
              {letterStatus === "sealed" && canOpen && "Ready to open."}
              {letterStatus === "opened" && "Opened — keep reviewing each morning."}
            </p>
            <Link to="/living-hope/letter" className="block mt-2">
              <Button variant="secondary" size="sm" className="w-full rounded-xl bg-white/10 text-white hover:bg-white/15 border-0">
                <PenLine className="w-3.5 h-3.5 mr-2" />
                {letterStatus === "draft" ? "Write letter" : "View letter"}
              </Button>
            </Link>
          </section>

          <div>
            <h2 className="text-[11px] uppercase tracking-wider text-white/40 px-1 mb-2">Workbook</h2>
            <ul className="space-y-1">
              {WORKBOOK_SECTIONS.map((s) => (
                <li key={s.key}>
                  <Link
                    to={`/living-hope/workbook/${s.key}`}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 hover:bg-white/8 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] text-white">{s.label}</p>
                      <p className="text-[11px] text-white/40 truncate">{s.hint}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {goals.length > 0 ? (
            <section>
              <h2 className="text-[11px] uppercase tracking-wider text-white/40 px-1 mb-2">
                Goals ({goals.length})
              </h2>
              <ul className="space-y-1">
                {goals.slice(0, 3).map((g) => (
                  <li
                    key={g.id}
                    className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-[13px] text-white truncate"
                  >
                    {g.title}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-[10px] text-white/30 text-center pt-2 pb-1 leading-relaxed">
            Heb 11:1 · Thy will be done
          </p>
        </div>
      )}
    </LivingHopeChrome>
  );
}

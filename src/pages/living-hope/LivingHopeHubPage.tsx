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
import { lh } from "@/lib/livingHope/themeClasses";
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
          <Loader2 className={cn("w-6 h-6 animate-spin", lh.spinner)} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 py-2 overflow-y-auto scrollbar-hide md:grid md:grid-cols-2 md:gap-4 md:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-3 min-w-0">
          <section className={cn(lh.card, "p-4 md:p-5")}>
            <div className="flex items-start gap-3">
              <div className={lh.iconBox}>
                <Sunrise className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className={lh.titleMd}>Morning formula</h1>
                <p className={cn("mt-0.5", lh.bodySm)}>
                  Manifesto → vision → story → goals → surrender. See it before it arrives.
                </p>
                {streak > 0 ? (
                  <p className={cn("mt-1.5 text-[11px]", lh.accentMuted)}>{streak}-day streak</p>
                ) : null}
              </div>
            </div>
            <Link to="/living-hope/review" className="block mt-3">
              <Button
                className={cn(
                  "w-full rounded-xl h-10 font-medium text-sm",
                  reviewedToday ? lh.btnReviewed : "bg-amber-400 text-amber-950 hover:bg-amber-300",
                )}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {reviewedToday ? "Review again" : "Start morning review"}
              </Button>
            </Link>
          </section>

          {workbook?.vision_headline ? (
            <section className={lh.visionBanner}>
              <p className={cn(lh.labelUpper, "text-amber-700/70 mb-1")}>Vision</p>
              <p className="text-[13px] text-stone-700 leading-snug line-clamp-3">{workbook.vision_headline}</p>
              {workbook.income_total_label ? (
                <p className={cn("text-[12px] mt-1", lh.accentMuted)}>{workbook.income_total_label}</p>
              ) : null}
            </section>
          ) : null}

          <section className={cn(lh.card, "p-4")}>
            <div className="flex items-center gap-2 mb-2">
              <Mail className={cn("w-4 h-4", lh.icon)} />
              <h2 className={lh.heading}>Letter from the future</h2>
            </div>
            <p className={lh.bodySm}>
              {letterStatus === "draft" && "Write your 2-year letter — the full story of who you became."}
              {letterStatus === "sealed" && !canOpen && `Sealed until ${formatUnlockLabel(letter?.unlock_at ?? null)}.`}
              {letterStatus === "sealed" && canOpen && "Ready to open."}
              {letterStatus === "opened" && "Opened — keep reviewing each morning."}
            </p>
            <Link to="/living-hope/letter" className="block mt-2">
              <Button variant="secondary" size="sm" className={cn("w-full", lh.btnSecondary)}>
                <PenLine className="w-3.5 h-3.5 mr-2" />
                {letterStatus === "draft" ? "Write letter" : "View letter"}
              </Button>
            </Link>
          </section>
          </div>

          <div className="space-y-3 min-w-0">
          <div>
            <h2 className={cn(lh.labelUpper, "px-1 mb-2")}>Workbook</h2>
            <ul className="space-y-1">
              {WORKBOOK_SECTIONS.map((s) => (
                <li key={s.key}>
                  <Link to={`/living-hope/workbook/${s.key}`} className={lh.row}>
                    <div className="min-w-0">
                      <p className="text-[14px] text-stone-900">{s.label}</p>
                      <p className={cn("text-[11px] truncate", lh.faint)}>{s.hint}</p>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 shrink-0", lh.faint)} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {goals.length > 0 ? (
            <section>
              <h2 className={cn(lh.labelUpper, "px-1 mb-2")}>Goals ({goals.length})</h2>
              <ul className="space-y-1">
                {goals.slice(0, 3).map((g) => (
                  <li key={g.id} className={cn(lh.cardFlat, "px-3 py-2 text-[13px] text-stone-800 truncate")}>
                    {g.title}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          </div>

          <p className={cn(lh.footnote, "text-center pt-2 pb-1 leading-relaxed md:col-span-2")}>
            Heb 11:1 · Thy will be done
          </p>
        </div>
      )}
    </LivingHopeChrome>
  );
}

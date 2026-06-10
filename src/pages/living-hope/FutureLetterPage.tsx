import { useCallback, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2, Lock, Plus, Unlock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GoalEditorCard } from "@/components/living-hope/GoalEditorCard";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { useLivingHope } from "@/hooks/useLivingHope";
import {
  computeUnlockAt,
  formatUnlockLabel,
  isLetterUnlockable,
  LETTER_SECTIONS,
  TIMEFRAME_OPTIONS,
  type LetterSectionKey,
} from "@/lib/livingHope/letterSections";
import type { LivingHopeLetterRow } from "@/lib/livingHope/api";
import { cn } from "@/lib/utils";

const FIELD_MAP: Record<LetterSectionKey, keyof LivingHopeLetterRow> = {
  mission: "mission_statement",
  gratitude: "gratitude",
  realizations: "realizations",
  outlook: "outlook",
  wishes: "wishes",
  scripture: "scripture_anchor",
  surrender: "surrender_prayer",
};

export default function FutureLetterPage() {
  const { user, loading } = useAuth();
  const {
    busy,
    letter,
    goals,
    saveLetterField,
    setTimeframe,
    seal,
    unlock,
    addGoal,
    patchGoal,
    removeGoal,
  } = useLivingHope(user?.id);

  const [sealOpen, setSealOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (key: LetterSectionKey, value: string) => {
      if (!letter || letter.status !== "draft") return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveLetterField({ [FIELD_MAP[key]]: value });
      }, 600);
    },
    [letter, saveLetterField],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const isDraft = letter?.status === "draft";
  const isSealed = letter?.status === "sealed";
  const canUnlock = letter?.unlock_at && isLetterUnlockable(letter.unlock_at);
  const readOnly = isSealed && !canUnlock;

  const handleAddGoal = async () => {
    const t = newGoalTitle.trim();
    if (!t) return;
    await addGoal({ title: t });
    setNewGoalTitle("");
  };

  return (
    <LivingHopeChrome
      subtitle={
        isDraft
          ? "Write to future-you. Seal it when ready — then review each morning."
          : isSealed && !canUnlock
            ? `Sealed · opens ${formatUnlockLabel(letter?.unlock_at ?? null)}`
            : "Your letter"
      }
      right={
        isDraft ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-300 hover:text-amber-200 hover:bg-white/10 text-[11px] uppercase tracking-wider h-8 px-2"
            onClick={() => setSealOpen(true)}
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            Seal
          </Button>
        ) : isSealed && canUnlock ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-300 hover:text-amber-200 hover:bg-white/10 text-[11px] uppercase tracking-wider h-8 px-2"
            onClick={() => void unlock()}
          >
            <Unlock className="w-3.5 h-3.5 mr-1" />
            Open
          </Button>
        ) : null
      }
    >
      {busy || !letter ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-5 -mx-1 px-1">
          {isDraft ? (
            <div className="flex gap-2 flex-wrap">
              {TIMEFRAME_OPTIONS.map((opt) => (
                <button
                  key={opt.years}
                  type="button"
                  onClick={() => void setTimeframe(opt.years)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[12px] font-medium transition",
                    letter.timeframe_years === opt.years
                      ? "bg-amber-400/25 text-amber-100 border border-amber-400/40"
                      : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : null}

          <section className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 backdrop-blur-sm">
            <h3 className="text-[14px] font-medium text-white mb-1">Letter from 2 years in the future</h3>
            <p className="text-[12px] text-white/45 mb-2 leading-relaxed">
              The full narrative — paste your Reflect letter here. This is what you read in morning review.
            </p>
            <Textarea
              defaultValue={letter.full_letter ?? ""}
              readOnly={readOnly}
              rows={16}
              placeholder="Dear past me — two years ago everything felt like it was falling apart…"
              onChange={(e) => {
                if (saveTimer.current) clearTimeout(saveTimer.current);
                saveTimer.current = setTimeout(() => {
                  void saveLetterField({ full_letter: e.target.value });
                }, 600);
              }}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none text-[15px] leading-relaxed"
            />
          </section>

          {LETTER_SECTIONS.map((sec) => {
            const field = FIELD_MAP[sec.key];
            const value = (letter[field] as string | null) ?? "";
            return (
              <section key={sec.key} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="flex items-baseline gap-2 mb-1">
                  {sec.growLabel ? (
                    <span className="text-[10px] font-bold text-amber-400/70 w-4">{sec.growLabel}</span>
                  ) : null}
                  <h3 className="text-[14px] font-medium text-white">{sec.label}</h3>
                </div>
                <p className="text-[12px] text-white/45 mb-2 leading-relaxed">{sec.hint}</p>
                <Textarea
                  defaultValue={value}
                  readOnly={readOnly}
                  rows={sec.rows}
                  placeholder={sec.placeholder}
                  onChange={(e) => debouncedSave(sec.key, e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 resize-none text-[15px] leading-relaxed"
                />
              </section>
            );
          })}

          <section className="space-y-3">
            <div>
              <h3 className="text-[14px] font-medium text-white mb-1">Fractal goals</h3>
              <p className="text-[12px] text-white/45 leading-relaxed">
                Big goals → smaller steps. What you review each morning with vivid detail.
              </p>
            </div>

            {goals.map((g) => (
              <GoalEditorCard
                key={g.id}
                goal={g}
                locked={readOnly}
                onPatch={(patch) => void patchGoal(g.id, patch)}
                onDelete={() => void removeGoal(g.id)}
              />
            ))}

            {!readOnly ? (
              <div className="flex gap-2">
                <input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleAddGoal()}
                  placeholder="New goal…"
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[15px] text-white placeholder:text-white/30"
                />
                <Button
                  type="button"
                  onClick={() => void handleAddGoal()}
                  className="rounded-xl bg-white/10 hover:bg-white/15 text-white border-0 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      )}

      <AlertDialog open={sealOpen} onOpenChange={setSealOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Seal this letter?</AlertDialogTitle>
            <AlertDialogDescription>
              Your letter will be locked until{" "}
              {letter
                ? formatUnlockLabel(computeUnlockAt(new Date(), letter.timeframe_years).toISOString())
                : "the unlock date"}
              . You can still do morning reviews with your goals every day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void seal();
                setSealOpen(false);
              }}
            >
              Seal letter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LivingHopeChrome>
  );
}

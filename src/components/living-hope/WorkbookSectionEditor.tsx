import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  newId,
  type LivingHopeWorkbookContent,
  type WorkbookSection,
} from "@/lib/livingHope/workbookTypes";
import { WORSHIP_MUSIC_HINT } from "@/lib/livingHope/worshipMusic";
import { cn } from "@/lib/utils";

type Props = {
  section: WorkbookSection;
  workbook: LivingHopeWorkbookContent;
  onChange: (next: LivingHopeWorkbookContent) => void;
  /** For weekly section — answer inputs */
  weeklyAnswers?: string[];
  onWeeklyAnswersChange?: (answers: string[]) => void;
  /** For metrics — today's values */
  metricValues?: Record<string, string>;
  onMetricValuesChange?: (v: Record<string, string>) => void;
};

export function WorkbookSectionEditor({
  section,
  workbook,
  onChange,
  weeklyAnswers,
  onWeeklyAnswersChange,
  metricValues,
  onMetricValuesChange,
}: Props) {
  const set = (patch: Partial<LivingHopeWorkbookContent>) => onChange({ ...workbook, ...patch });

  if (section === "vision") {
    return (
      <div className="space-y-4">
        <Field label="Vision headline" hint="Never look backwards — the future is in front.">
          <Textarea
            value={workbook.vision_headline}
            onChange={(e) => set({ vision_headline: e.target.value })}
            rows={3}
            className="field-input"
            placeholder="What would it be like to live with $X per month in 2 years?"
          />
        </Field>
        <Field label="Income lines" hint="Fractal breakdown — structure, not fantasy.">
          {workbook.income_lines.map((line, i) => (
            <div key={line.id} className="flex gap-2 mb-2">
              <Input
                value={line.label}
                onChange={(e) => {
                  const next = [...workbook.income_lines];
                  next[i] = { ...line, label: e.target.value };
                  set({ income_lines: next });
                }}
                className="field-input flex-1"
                placeholder="Mortgage Platform"
              />
              <Input
                value={line.amount}
                onChange={(e) => {
                  const next = [...workbook.income_lines];
                  next[i] = { ...line, amount: e.target.value };
                  set({ income_lines: next });
                }}
                className="field-input w-28"
                placeholder="$400k/mo"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(lh.faint, "shrink-0")}
                onClick={() => set({ income_lines: workbook.income_lines.filter((_, j) => j !== i) })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <AddRow
            onClick={() =>
              set({
                income_lines: [...workbook.income_lines, { id: newId(), label: "", amount: "" }],
              })
            }
          />
        </Field>
        <Field label="Total label">
          <Input
            value={workbook.income_total_label}
            onChange={(e) => set({ income_total_label: e.target.value })}
            className="field-input"
            placeholder="Total: $1,000,000+ per month"
          />
        </Field>
        <Field label="Tagline">
          <Input
            value={workbook.vision_tagline}
            onChange={(e) => set({ vision_tagline: e.target.value })}
            className="field-input"
          />
        </Field>
      </div>
    );
  }

  if (section === "stories" || section === "manifesto" || section === "quotes") {
    const key = section === "stories" ? "stories" : section === "manifesto" ? "manifesto" : "quotes";
    const items = workbook[key];
    return (
      <StringListEditor
        items={items.map((x) => x.text)}
        placeholder={
          section === "stories"
            ? "Tithing $100k months casually…"
            : section === "manifesto"
              ? "I do difficult things until they become easy."
              : "Start with GOD. Everything else works out."
        }
        onChange={(texts) =>
          set({
            [key]: texts.map((text, i) => ({
              id: items[i]?.id ?? newId(),
              text,
            })),
          })
        }
      />
    );
  }

  if (
    section === "lifestyle" ||
    section === "standards" ||
    section === "family" ||
    section === "rules"
  ) {
    const key =
      section === "lifestyle"
        ? "lifestyle"
        : section === "standards"
          ? "financial_standards"
          : section === "family"
            ? "family_leadership"
            : "rules_of_operation";
    return (
      <StringListEditor
        items={workbook[key]}
        placeholder="One line per bullet…"
        onChange={(texts) => set({ [key]: texts })}
      />
    );
  }

  if (section === "routine") {
    return (
      <div className="space-y-3">
        <div className={cn(lh.cardFlat, "p-3 space-y-2")}>
          <label className={cn(lh.label, "block")} htmlFor="workbook-worship-playlist">
            Worship playlist
          </label>
          <Input
            id="workbook-worship-playlist"
            value={workbook.worship_playlist_url}
            onChange={(e) => set({ worship_playlist_url: e.target.value })}
            className="field-input"
            placeholder="https://open.spotify.com/playlist/…"
          />
          <p className={cn(lh.footnote, "leading-snug")}>{WORSHIP_MUSIC_HINT}</p>
        </div>
        {workbook.routine.map((item, i) => (
          <div key={item.id} className={cn(lh.cardFlat, "p-3 space-y-2")}>
            <div className="flex gap-2">
              <Input
                value={item.label}
                onChange={(e) => {
                  const next = [...workbook.routine];
                  next[i] = { ...item, label: e.target.value };
                  set({ routine: next });
                }}
                className="field-input flex-1"
                placeholder="8 hours sleep"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={lh.faint}
                onClick={() => set({ routine: workbook.routine.filter((_, j) => j !== i) })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={item.detail ?? ""}
              onChange={(e) => {
                const next = [...workbook.routine];
                next[i] = { ...item, detail: e.target.value };
                set({ routine: next });
              }}
              className="field-input text-sm"
              placeholder="protect energy like capital"
            />
          </div>
        ))}
        <AddRow
          onClick={() => set({ routine: [...workbook.routine, { id: newId(), label: "", detail: "" }] })}
          label="Add routine item"
        />
      </div>
    );
  }

  if (section === "business") {
    return (
      <div className="space-y-4">
        {workbook.business_targets.map((biz, bi) => (
          <div key={biz.id} className={cn(lh.cardFlat, "p-3")}>
            <div className="flex gap-2 mb-2">
              <Input
                value={biz.name}
                onChange={(e) => {
                  const next = [...workbook.business_targets];
                  next[bi] = { ...biz, name: e.target.value };
                  set({ business_targets: next });
                }}
                className="field-input flex-1 font-medium"
                placeholder="Mortgage Platform"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={lh.faint}
                onClick={() =>
                  set({ business_targets: workbook.business_targets.filter((_, j) => j !== bi) })
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <StringListEditor
              items={biz.kpis}
              placeholder="100 funded loans/month"
              onChange={(kpis) => {
                const next = [...workbook.business_targets];
                next[bi] = { ...biz, kpis };
                set({ business_targets: next });
              }}
              compact
            />
          </div>
        ))}
        <AddRow
          onClick={() =>
            set({
              business_targets: [
                ...workbook.business_targets,
                { id: newId(), name: "", kpis: [""] },
              ],
            })
          }
          label="Add business"
        />
      </div>
    );
  }

  if (section === "weekly" && weeklyAnswers && onWeeklyAnswersChange) {
    return (
      <div className="space-y-4">
        {workbook.weekly_questions.map((q, i) => (
          <Field key={i} label={q}>
            <Textarea
              value={weeklyAnswers[i] ?? ""}
              onChange={(e) => {
                const next = [...weeklyAnswers];
                next[i] = e.target.value;
                onWeeklyAnswersChange(next);
              }}
              rows={3}
              className="field-input"
            />
          </Field>
        ))}
        <p className={cn("text-[11px]", lh.faint)}>
          Edit questions in workbook — tap ⋯ on hub if we add settings later.
        </p>
      </div>
    );
  }

  if (section === "metrics" && metricValues && onMetricValuesChange) {
    return (
      <div className="space-y-4">
        <Field label="Define metrics" hint="Track daily / weekly in morning review.">
          {workbook.metrics.map((m, i) => (
            <div key={m.id} className="flex gap-2 mb-2">
              <Input
                value={m.label}
                onChange={(e) => {
                  const next = [...workbook.metrics];
                  next[i] = { ...m, label: e.target.value };
                  set({ metrics: next });
                }}
                className="field-input flex-1"
                placeholder="Personal energy"
              />
              <Input
                value={m.unit ?? ""}
                onChange={(e) => {
                  const next = [...workbook.metrics];
                  next[i] = { ...m, unit: e.target.value };
                  set({ metrics: next });
                }}
                className="field-input w-24"
                placeholder="1-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={lh.faint}
                onClick={() => set({ metrics: workbook.metrics.filter((_, j) => j !== i) })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <AddRow
            onClick={() => set({ metrics: [...workbook.metrics, { id: newId(), label: "", unit: "" }] })}
          />
        </Field>
        {workbook.metrics.length > 0 ? (
          <Field label="Today's values">
            {workbook.metrics.map((m) => (
              <div key={m.id} className="flex items-center gap-2 mb-2">
                <span className={cn("text-[13px] w-32 shrink-0 truncate", lh.muted)}>{m.label}</span>
                <Input
                  value={metricValues[m.id] ?? ""}
                  onChange={(e) => onMetricValuesChange({ ...metricValues, [m.id]: e.target.value })}
                  className="field-input flex-1"
                  placeholder={m.unit ?? "value"}
                />
              </div>
            ))}
          </Field>
        ) : null}
      </div>
    );
  }

  return null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={cn("text-[12px] font-medium block mb-0.5", "text-stone-700")}>{label}</label>
      {hint ? <p className={cn("text-[11px] mb-2", lh.faint)}>{hint}</p> : null}
      {children}
    </div>
  );
}

function StringListEditor({
  items,
  onChange,
  placeholder,
  compact,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  compact?: boolean;
}) {
  const list = items.length ? items : [""];
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {list.map((text, i) => (
        <div key={i} className="flex gap-2">
          <Textarea
            value={text}
            onChange={(e) => {
              const next = [...list];
              next[i] = e.target.value;
              onChange(next.filter((_, j) => j < next.length - 1 || next[j].trim()));
            }}
            rows={compact ? 1 : 2}
            className="field-input flex-1 resize-none"
            placeholder={placeholder}
          />
          {list.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(lh.faint, "shrink-0")}
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          ) : null}
        </div>
      ))}
      <AddRow onClick={() => onChange([...list, ""])} />
    </div>
  );
}

function AddRow({ onClick, label = "Add" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={lh.addLink}
    >
      <Plus className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

import { useCallback, useState } from "react";
import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  loadCustomSpiritQuestions,
  saveCustomSpiritQuestions,
  SPIRIT_LISTENING_QUESTION_BANK,
} from "@/lib/journal/spiritListeningQuestions";
import { cn } from "@/lib/utils";

type Props = {
  onUseQuestion: (question: string) => void;
  className?: string;
};

function QuestionRow({
  question,
  onUse,
  onCopy,
}: {
  question: string;
  onUse: () => void;
  onCopy: () => void;
}) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-2.5">
      <p className="flex-1 text-[13px] leading-snug text-foreground/90">{question}</p>
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[12px]" onClick={onUse}>
          Use
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label="Copy question"
          onClick={onCopy}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function CategoryBlock({
  label,
  questions,
  defaultOpen,
  onUseQuestion,
  onCopyQuestion,
}: {
  label: string;
  questions: string[];
  defaultOpen?: boolean;
  onUseQuestion: (q: string) => void;
  onCopyQuestion: (q: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (!questions.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-left text-[13px] font-medium hover:bg-muted/35">
        <span>{label}</span>
        <span className="flex items-center gap-2 text-[11px] font-normal text-muted-foreground">
          {questions.length}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <ul className="space-y-2">
          {questions.map((q) => (
            <QuestionRow
              key={q}
              question={q}
              onUse={() => onUseQuestion(q)}
              onCopy={() => onCopyQuestion(q)}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SpiritListeningQuestionBank({ onUseQuestion, className }: Props) {
  const { toast } = useToast();
  const [customQuestions, setCustomQuestions] = useState<string[]>(() => loadCustomSpiritQuestions());
  const [newQuestion, setNewQuestion] = useState("");
  const [myOpen, setMyOpen] = useState(false);

  const copyQuestion = useCallback(
    async (question: string) => {
      try {
        await navigator.clipboard.writeText(question);
        toast({ title: "Copied", description: "Question copied — ask it aloud when you're ready." });
      } catch {
        toast({ title: "Couldn't copy", variant: "destructive" });
      }
    },
    [toast],
  );

  const handleUse = useCallback(
    (question: string) => {
      onUseQuestion(question);
      toast({ title: "Question added", description: "Ask it slowly, listen, then write what you hear below." });
    },
    [onUseQuestion, toast],
  );

  const addCustomQuestion = useCallback(() => {
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    if (customQuestions.includes(trimmed)) {
      setNewQuestion("");
      return;
    }
    const next = [trimmed, ...customQuestions];
    setCustomQuestions(next);
    saveCustomSpiritQuestions(next);
    setNewQuestion("");
  }, [customQuestions, newQuestion]);

  const removeCustomQuestion = useCallback((question: string) => {
    setCustomQuestions((prev) => {
      const next = prev.filter((q) => q !== question);
      saveCustomSpiritQuestions(next);
      return next;
    });
  }, []);

  return (
    <section className={cn("rounded-lg border border-amber-300/50 bg-background/90 p-3", className)}>
      <h2 className="text-sm font-semibold leading-tight">Questions to ask</h2>
      <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
        Pick one. Ask slowly. Then be quiet and listen before you write.
      </p>

      <div className="mt-3 space-y-2">
        {SPIRIT_LISTENING_QUESTION_BANK.map((cat, i) => (
          <CategoryBlock
            key={cat.id}
            label={cat.label}
            questions={[...cat.questions]}
            defaultOpen={i === 0}
            onUseQuestion={handleUse}
            onCopyQuestion={copyQuestion}
          />
        ))}

        <Collapsible open={myOpen} onOpenChange={setMyOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-dashed border-amber-400/50 bg-amber-50/50 px-3 py-2 text-left text-[13px] font-medium dark:bg-amber-950/20">
            <span>My questions</span>
            <span className="flex items-center gap-2 text-[11px] font-normal text-muted-foreground">
              {customQuestions.length}
              <ChevronDown className={cn("h-4 w-4 transition-transform", myOpen && "rotate-180")} />
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <div className="flex gap-2">
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add a question you want ready…"
                className="h-9 text-[13px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomQuestion();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={addCustomQuestion}>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add question</span>
              </Button>
            </div>
            {customQuestions.length ? (
              <ul className="space-y-2">
                {customQuestions.map((q) => (
                  <li
                    key={q}
                    className="flex items-start gap-2 rounded-lg border border-border/60 bg-background/90 px-3 py-2.5"
                  >
                    <p className="flex-1 text-[13px] leading-snug">{q}</p>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[12px]" onClick={() => handleUse(q)}>
                        Use
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        aria-label="Copy question"
                        onClick={() => void copyQuestion(q)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Remove question"
                        onClick={() => removeCustomQuestion(q)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted-foreground px-1">Save questions here so you&apos;re ready when you get a moment to ask.</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}

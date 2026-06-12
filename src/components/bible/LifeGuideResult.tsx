import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, HandHeart, ScrollText } from "lucide-react";
import { findBookByAbbr } from "@/data/books";
import { parseBibleReference } from "@/lib/bible/parseBibleReference";
import type { LifeGuideResult as LifeGuideResultType } from "@/lib/bible/lifeGuide";
import { cn } from "@/lib/utils";

interface Props {
  result: LifeGuideResultType;
  className?: string;
}

function readerPath(book: string, chapter: number, verse: number): string {
  const parsed = parseBibleReference(`${book} ${chapter}:${verse}`);
  const abbr = parsed?.bookAbbr ?? findBookByAbbr(book)?.abbr ?? book;
  return `/read/${abbr}/${chapter}?v=${verse}`;
}

export function LifeGuideResult({ result, className }: Props) {
  return (
    <div className={cn("space-y-6", className)}>
      <section className="rounded-2xl border border-gold/30 bg-paper-warm/80 p-5 paper-texture">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold-deep mb-2">
          <ScrollText className="w-3.5 h-3.5" aria-hidden />
          What Scripture says about {result.topic}
        </div>
        <p className="font-scripture text-[17px] leading-relaxed text-foreground">{result.summary}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Passages — read literally
        </h2>
        {result.passages.map((p) => (
          <article
            key={`${p.reference}-${p.verse}`}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-display text-xl text-leather">{p.reference}</h3>
              <Link
                to={readerPath(p.book, p.chapter, p.verse)}
                className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden />
                Open
              </Link>
            </div>
            <blockquote className="font-scripture text-[16px] leading-relaxed italic text-foreground/90 border-l-2 border-gold/50 pl-4 mb-4">
              &ldquo;{p.text}&rdquo;
            </blockquote>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Literal meaning
                </div>
                <p className="leading-relaxed">{p.literal_meaning}</p>
              </div>
              <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-amber-800 mb-1 font-semibold">
                  Do this
                </div>
                <p className="text-amber-950 leading-relaxed font-medium">{p.do_this}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {result.action_steps.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
            Your action plan this week
          </div>
          <ol className="space-y-2">
            {result.action_steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-snug">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {result.prayer && (
        <section className="rounded-2xl border border-gold/25 bg-gradient-to-br from-paper-warm to-amber-50/40 p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold-deep mb-2">
            <HandHeart className="w-3.5 h-3.5" aria-hidden />
            Prayer from the text
          </div>
          <p className="font-scripture text-[16px] leading-relaxed italic text-foreground/90">{result.prayer}</p>
        </section>
      )}
    </div>
  );
}

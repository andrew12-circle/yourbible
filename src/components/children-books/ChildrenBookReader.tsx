import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  Image as ImageIcon,
  Library,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { BookScene } from "@/components/bible/BookScene";
import { PageFlip } from "@/components/bible/PageFlip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useReaderCompactChrome, useReaderSpread } from "@/hooks/use-reader-layout";
import {
  buildChildrenBookGenerationPrompt,
  type ChildrenBook,
  type ChildrenBookPage,
  type ChildrenBookSymbol,
} from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

type ChildrenBookReaderProps = {
  books: ChildrenBook[];
  book: ChildrenBook;
  showHubShell: boolean;
  onSelectBook: (slug: string) => void;
};

type TurnDirection = "forward" | "back";

const paletteClasses: Record<ChildrenBookPage["palette"], string> = {
  dawn: "from-amber-100 via-rose-50 to-sky-100",
  garden: "from-emerald-100 via-lime-50 to-rose-100",
  royal: "from-violet-100 via-amber-50 to-rose-100",
  starlight: "from-indigo-100 via-sky-50 to-amber-100",
};

const symbolClasses: Record<ChildrenBookSymbol, string> = {
  crown: "bg-amber-500 text-white shadow-amber-900/20",
  heart: "bg-rose-500 text-white shadow-rose-900/20",
  light: "bg-sky-500 text-white shadow-sky-900/20",
  shield: "bg-emerald-500 text-white shadow-emerald-900/20",
};

function StorySymbol({ symbol, className }: { symbol: ChildrenBookSymbol; className?: string }) {
  const iconClass = "h-8 w-8";
  const icons = {
    crown: <Crown className={iconClass} aria-hidden />,
    heart: <Heart className={iconClass} aria-hidden />,
    light: <Sparkles className={iconClass} aria-hidden />,
    shield: <ShieldCheck className={iconClass} aria-hidden />,
  } satisfies Record<ChildrenBookSymbol, JSX.Element>;

  return (
    <span
      className={cn(
        "inline-flex h-16 w-16 items-center justify-center rounded-full shadow-lg",
        symbolClasses[symbol],
        className,
      )}
    >
      {icons[symbol]}
    </span>
  );
}

function StoryPageFace({
  page,
  book,
  pageNumber,
}: {
  page: ChildrenBookPage;
  book: ChildrenBook;
  pageNumber: number;
}) {
  return (
    <article className="relative flex h-full min-h-0 flex-col overflow-hidden bg-paper px-5 pb-20 pt-8 sm:px-7">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        <span>{book.title}</span>
        <span>Page {pageNumber}</span>
      </div>

      <div
        className={cn(
          "mt-4 flex min-h-[10rem] flex-1 flex-col items-center justify-center overflow-hidden rounded-[1.25rem] border border-white/70 bg-gradient-to-br p-5 text-center shadow-inner",
          paletteClasses[page.palette],
        )}
      >
        <StorySymbol symbol={page.symbol} />
        <h2 className="mt-5 font-display text-2xl leading-tight text-leather sm:text-3xl">
          {page.title}
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-leather/75">
          {page.picturePrompt}
        </p>
      </div>

      <div className="shrink-0 space-y-3 pt-5">
        <p className="font-display text-lg leading-snug text-foreground sm:text-xl">
          {page.body}
        </p>
        <p className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs leading-relaxed text-leather/80">
          <span className="font-semibold">Thread: </span>
          {page.scriptureThread}
        </p>
      </div>
    </article>
  );
}

function EndPageFace({ book }: { book: ChildrenBook }) {
  return (
    <article className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-paper px-8 pb-16 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-[2rem] shadow-lg"
        style={{ background: book.coverGradient }}
      >
        <BookOpen className="h-11 w-11 text-white" aria-hidden />
      </div>
      <h2 className="mt-6 font-display text-3xl text-leather">The end</h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Save this story seed, then generate the next illustrated page set with the AI studio.
      </p>
    </article>
  );
}

function LibraryPanel({
  books,
  activeSlug,
  onSelectBook,
}: {
  books: ChildrenBook[];
  activeSlug: string;
  onSelectBook: (slug: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <Library className="h-4 w-4 text-leather" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">Story library</h2>
      </div>
      <div className="mt-3 space-y-2">
        {books.map((item) => {
          const active = item.slug === activeSlug;
          return (
            <button
              key={item.slug}
              type="button"
              onClick={() => onSelectBook(item.slug)}
              className={cn(
                "w-full rounded-xl border px-3 py-3 text-left transition",
                active
                  ? "border-gold/70 bg-gold/15 shadow-sm"
                  : "border-border/60 bg-background/70 hover:border-gold/50",
              )}
            >
              <span className="block text-sm font-medium leading-tight">{item.title}</span>
              <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                {item.spiritualFocus}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AiStudioPanel({ book }: { book: ChildrenBook }) {
  const [sourceTitle, setSourceTitle] = useState("");
  const [spiritualAngle, setSpiritualAngle] = useState(book.spiritualFocus);

  useEffect(() => {
    setSpiritualAngle(book.spiritualFocus);
  }, [book.spiritualFocus]);

  const prompt = useMemo(() => {
    const customTitle = sourceTitle.trim();
    const basePrompt = buildChildrenBookGenerationPrompt(book);
    if (!customTitle) return basePrompt;
    return `${basePrompt} Source inspiration: ${customTitle}. Spiritual angle: ${spiritualAngle.trim() || book.spiritualFocus}.`;
  }, [book, sourceTitle, spiritualAngle]);

  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-leather" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">AI story studio</h2>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Draft original, faith-centered children's books with an illustration prompt on every page.
      </p>

      <label className="mt-4 block text-xs font-medium text-foreground" htmlFor="children-book-source">
        Source inspiration
      </label>
      <input
        id="children-book-source"
        value={sourceTitle}
        onChange={(event) => setSourceTitle(event.target.value)}
        placeholder="e.g. Cinderella, Beauty, a bedtime idea"
        className="mt-1 h-10 w-full rounded-xl border border-border/70 bg-background/80 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <label className="mt-3 block text-xs font-medium text-foreground" htmlFor="children-book-angle">
        Kingdom lesson
      </label>
      <Textarea
        id="children-book-angle"
        value={spiritualAngle}
        onChange={(event) => setSpiritualAngle(event.target.value)}
        rows={3}
        className="mt-1 resize-none rounded-xl bg-background/80 text-sm"
      />

      <div className="mt-4 rounded-xl border border-dashed border-gold/40 bg-gold/10 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-leather">
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          Generation prompt
        </div>
        <p className="mt-2 max-h-32 overflow-y-auto text-[11px] leading-relaxed text-leather/80">
          {prompt}
        </p>
      </div>
    </section>
  );
}

export function ChildrenBookReader({
  books,
  book,
  showHubShell,
  onSelectBook,
}: ChildrenBookReaderProps) {
  const readerSpread = useReaderSpread();
  const compactChrome = useReaderCompactChrome();
  const [pageIndex, setPageIndex] = useState(0);
  const [direction, setDirection] = useState<TurnDirection>("forward");

  const effectiveSpread = readerSpread && !compactChrome;
  const spreadStep = effectiveSpread ? 2 : 1;
  const visiblePageIndex = effectiveSpread ? Math.floor(pageIndex / 2) * 2 : pageIndex;
  const rightPageIndex = effectiveSpread ? visiblePageIndex + 1 : visiblePageIndex + 1;
  const canGoBack = visiblePageIndex > 0;
  const canGoForward = visiblePageIndex + spreadStep < book.pages.length;
  const progress = book.pages.length <= 1 ? 0 : visiblePageIndex / (book.pages.length - 1);

  useEffect(() => {
    setPageIndex(0);
    setDirection("forward");
  }, [book.slug]);

  const turnPage = (nextDirection: TurnDirection) => {
    setDirection(nextDirection);
    setPageIndex((current) => {
      const next = nextDirection === "forward" ? current + spreadStep : current - spreadStep;
      return Math.min(Math.max(next, 0), book.pages.length - 1);
    });
  };

  const leftStoryPage = book.pages[visiblePageIndex] ?? book.pages[0]!;
  const rightStoryPage = book.pages[rightPageIndex];

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden bg-fabric",
        showHubShell ? "h-full" : "h-[100dvh]",
      )}
    >
      <header className="z-20 shrink-0 border-b border-white/40 bg-white/80 px-3 py-3 backdrop-blur md:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md"
              style={{ background: book.coverGradient }}
            >
              <BookOpen className="h-5 w-5 text-white" aria-hidden />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-xl text-leather sm:text-2xl">
                  Children's books
                </h1>
                <Badge variant="secondary" className="bg-white/70 text-[10px]">
                  {book.ageRange}
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">{book.title} - {book.sourceNote}</p>
            </div>
          </div>

          <select
            value={book.slug}
            onChange={(event) => onSelectBook(event.target.value)}
            className="h-10 max-w-full rounded-xl border border-border/70 bg-white/85 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring xl:hidden"
            aria-label="Choose children's book"
          >
            {books.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="grid min-h-0 min-w-0 flex-1 gap-3 overflow-hidden p-3 lg:p-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="relative min-h-[34rem] min-w-0 overflow-hidden rounded-2xl border border-white/50 bg-white/35 shadow-soft">
          <BookScene
            progress={progress}
            leftPage={
              <PageFlip
                pageKey={`${book.slug}-${visiblePageIndex}`}
                direction={direction}
                side="left"
                enableSlide={!effectiveSpread}
              >
                <StoryPageFace page={leftStoryPage} book={book} pageNumber={visiblePageIndex + 1} />
              </PageFlip>
            }
            rightPage={
              <PageFlip
                pageKey={`${book.slug}-${rightPageIndex}`}
                direction={direction}
                side="right"
                enableSlide={false}
              >
                {rightStoryPage ? (
                  <StoryPageFace page={rightStoryPage} book={book} pageNumber={rightPageIndex + 1} />
                ) : (
                  <EndPageFace book={book} />
                )}
              </PageFlip>
            }
            singlePage={!effectiveSpread}
            fillContainer
            fabricSurround
            hubInline={showHubShell}
            coverStyle={{
              "--lc-base": "28 35% 20%",
              "--lc-dark": "24 45% 13%",
              "--lc-light": "34 38% 33%",
              "--lc-highlight": "42 62% 58%",
              "--lc-border": "25 28% 9%",
            } as CSSProperties}
            coverClassName="leather-cover--foil-gold"
            pageClassName="reader-page-cream"
          />

          <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2 rounded-full border border-white/70 bg-white/85 px-2 py-2 shadow-md backdrop-blur">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => turnPage("back")}
              disabled={!canGoBack}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </Button>
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">Illustration on every page</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => turnPage("forward")}
              disabled={!canGoForward}
              className="rounded-full"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </section>

        <aside className="relative z-10 hidden min-h-0 min-w-0 flex-col gap-3 overflow-y-auto xl:flex">
          <LibraryPanel books={books} activeSlug={book.slug} onSelectBook={onSelectBook} />
          <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-leather" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">Story direction</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{book.summary}</p>
            <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Focus: </span>
              {book.spiritualFocus}
            </div>
          </section>
          <AiStudioPanel book={book} />
        </aside>
      </main>
    </div>
  );
}

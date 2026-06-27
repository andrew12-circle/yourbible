import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScriptureHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("scripture-heading", className)}>{children}</p>;
}

export function ScriptureParagraph({
  children,
  className,
  poetryLevel = 0,
  isContinuation = false,
}: {
  children: ReactNode;
  className?: string;
  poetryLevel?: number;
  isContinuation?: boolean;
}) {
  const poetryClass =
    poetryLevel > 0
      ? `scripture-poetry-q${Math.min(poetryLevel, 3)}${isContinuation ? " scripture-poetry-cont" : ""}`
      : isContinuation
        ? "scripture-paragraph scripture-paragraph-cont"
        : "scripture-paragraph";
  return (
    <p className={cn(poetryClass, className)} style={{ orphans: 2, widows: 2 }}>
      {children}
    </p>
  );
}

export function ScriptureChapterNumber({ chapter }: { chapter: number }) {
  return (
    <span className="chapter-drop-cap" aria-hidden>
      {chapter}
    </span>
  );
}

export function ScriptureVerseNumber({
  number,
  onClick,
}: {
  number: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className="verse-num"
      onClick={onClick}
      aria-label={`Verse ${number}`}
    >
      {number}
    </button>
  );
}

export function ScriptureWordsOfJesus({ children }: { children: ReactNode }) {
  return <span className="red-letter">{children}</span>;
}

export function ScriptureFootnoteMarker({ marker }: { marker: number }) {
  return <sup className="scripture-fn-marker">{marker}</sup>;
}

export function ScriptureCrossRef({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" className="scripture-xref-link" onClick={onClick}>
        {label}
      </button>
    );
  }
  return <span className="scripture-xref-label">{label}</span>;
}

export function ScriptureVerseShell({
  verseId,
  verseNumber,
  chapterOpen,
  children,
}: {
  verseId: string;
  verseNumber: number;
  chapterOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn("scripture-verse", chapterOpen && "scripture-verse-chapter-open")}
      data-verse={verseNumber}
      data-verse-id={verseId}
    >
      {children}
    </span>
  );
}

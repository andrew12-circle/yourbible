import { cn } from "@/lib/utils";

type Props = {
  title: string;
  html: string;
  className?: string;
};

/** Publisher book introduction (HTML from API.Bible). */
export function BookIntroductionBlock({ title, html, className }: Props) {
  if (!html.trim()) return null;
  return (
    <section className={cn("scripture-book-intro", className)} aria-label={`${title} introduction`}>
      <h2 className="scripture-book-intro-title">{title}</h2>
      <div
        className="scripture-book-intro-body selectable-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}

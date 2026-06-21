import { cn } from "@/lib/utils";

export type InterlinearToken = {
  word: string;
  lemma?: string;
  strongs?: string;
};

type Props = {
  tokens: InterlinearToken[];
  dir?: "ltr" | "rtl";
  className?: string;
  onStrongsClick?: (strongs: string) => void;
};

export function InterlinearWords({ tokens, dir = "ltr", className, onStrongsClick }: Props) {
  if (tokens.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} dir={dir}>
      {tokens.map((token, i) => {
        const clickable = Boolean(token.strongs && onStrongsClick);
        const Tag = clickable ? "button" : "span";
        return (
          <Tag
            key={`${token.word}-${i}`}
            type={clickable ? "button" : undefined}
            onClick={
              clickable && token.strongs
                ? () => onStrongsClick?.(token.strongs!)
                : undefined
            }
            className={cn(
              "inline-flex flex-col items-center rounded-md px-1.5 py-1 min-w-[2.5rem]",
              clickable
                ? "bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/30 cursor-pointer"
                : "bg-muted/30",
            )}
            title={token.lemma ? `Lemma: ${token.lemma}` : undefined}
          >
            <span className={dir === "rtl" ? "font-hebrew text-lg" : "font-greek text-lg"}>
              {token.word}
            </span>
            {token.strongs ? (
              <span className="text-[10px] font-mono text-primary/80">{token.strongs}</span>
            ) : null}
          </Tag>
        );
      })}
    </div>
  );
}

import { PageStackEdge } from "@/components/bible/PageStackEdge";
import { COVER_LEATHER, RIBBON_COLORS, coverLeatherStyle } from "@/lib/bible/palettes";
import { parseChatPrayer, splitPrayerSentences } from "@/lib/journal/parseChatPrayer";
import { LUMEN_NAME } from "@/lib/myai/lumenBrand";
import { cn } from "@/lib/utils";

const DECOR_RIBBONS = [
  { color: RIBBON_COLORS.find((c) => c.id === "red")!.hex, offset: 10 },
  { color: RIBBON_COLORS.find((c) => c.id === "blue")!.hex, offset: 18 },
  { color: RIBBON_COLORS.find((c) => c.id === "gold")!.hex, offset: 26 },
] as const;

type Props = {
  text: string;
  className?: string;
};

function PrayerScriptureBody({ body }: { body: string }) {
  const sentences = splitPrayerSentences(body);
  if (!sentences.length) return null;

  const [first, ...rest] = sentences;
  const dropCap = first.charAt(0);
  const firstRest = first.slice(1);

  return (
    <p className="chat-prayer-bible__body scripture-paragraph m-0">
      <span className="scripture-verse scripture-verse-chapter-open">
        <span className="chapter-drop-cap" aria-hidden>
          {dropCap}
        </span>
        <span className="verse-body-wrap">{firstRest}</span>
      </span>
      {rest.map((sentence, index) => (
        <span key={index} className="scripture-verse">
          <span className="verse-num verse-num-gutter" aria-hidden>
            {index + 2}
          </span>
          <span className="verse-body-wrap">{sentence}</span>
        </span>
      ))}
    </p>
  );
}

/** Lumen chat prayer — open Bible page with drop cap and verse numbers. */
export default function ChatPrayerBiblePage({ text, className }: Props) {
  const { label, title, body } = parseChatPrayer(text);
  if (!body) return null;

  return (
    <figure className={cn("chat-prayer-bible", className)}>
      <div
        className="chat-prayer-bible__cover reader-leather-cover leather-cover-surface"
        style={coverLeatherStyle(COVER_LEATHER.cordovan)}
      >
        <div className="chat-prayer-bible__frame">
          <div className="chat-prayer-bible__paper bg-paper">
            <PageStackEdge side="left" widthPx={14} />
            <div className="chat-prayer-bible__ribbons" aria-hidden>
              {DECOR_RIBBONS.map(({ color, offset }, index) => (
                <span
                  key={index}
                  className="chat-prayer-bible__ribbon"
                  style={{
                    right: offset,
                    background: `linear-gradient(180deg, ${color} 0%, ${color}dd 72%, ${color}99 100%)`,
                  }}
                />
              ))}
            </div>
            <div className="chat-prayer-bible__content">
              <p className="chat-prayer-bible__label">{label}</p>
              <h3 className="chat-prayer-bible__title">{title}</h3>
              <PrayerScriptureBody body={body} />
              <p className="chat-prayer-bible__footer">
                {LUMEN_NAME.replace(" AI", "")} • {label}
              </p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

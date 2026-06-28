import { useState } from "react";
import type { BiblePlate } from "@/lib/bible/biblePlates";
import { cn } from "@/lib/utils";

type Props = {
  plate: BiblePlate;
  /** Gallery / sheet layout — smaller caption, no full-page flex. */
  compact?: boolean;
};

export function ScripturePlate({ plate, compact = false }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <figure
      className={cn(
        "scripture-plate",
        compact ? "scripture-plate--compact" : "h-full min-h-0 flex flex-col",
      )}
    >
      <div
        className={cn(
          "scripture-plate-image-wrap",
          compact ? "" : "flex-1 min-h-0 flex items-center justify-center",
        )}
      >
        {failed ? (
          <div className="scripture-plate-fallback text-center px-6 text-muted-foreground text-sm">
            Illustration unavailable
          </div>
        ) : (
          <img
            src={plate.imageUrl}
            alt={plate.alt}
            className="scripture-plate-image"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption className="scripture-plate-caption">
        <span className="scripture-plate-title">{plate.title}</span>
        <span className="scripture-plate-ref"> {plate.referenceLabel}</span>
        {plate.artist ? (
          <span className="scripture-plate-artist block text-[0.85em] opacity-80 mt-0.5">
            {plate.artist}
            {plate.sourceUrl ? (
              <>
                {" · "}
                <a
                  href={plate.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:opacity-100"
                >
                  Source
                </a>
              </>
            ) : null}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

import { useState } from "react";
import type { BiblePlate } from "@/lib/bible/biblePlates";

type Props = {
  plate: BiblePlate;
};

export function ScripturePlate({ plate }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <figure className="scripture-plate h-full min-h-0 flex flex-col">
      <div className="scripture-plate-image-wrap flex-1 min-h-0 flex items-center justify-center">
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
      </figcaption>
    </figure>
  );
}

import { useState } from "react";
import type { BiblePlate } from "@/lib/bible/biblePlates";
import { biblePlateAssetUrl } from "@/lib/bible/biblePlateAssets";
import { cn } from "@/lib/utils";

type Props = { plate: BiblePlate; compact?: boolean };
function PlateImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) return <div className="scripture-plate-fallback flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground" role="status">
    <span>Illustration unavailable</span>
    <button type="button" className="min-h-11 rounded border px-4 py-2 underline underline-offset-2" onClick={() => { setAttempt((n) => n + 1); setFailed(false); }}>Retry illustration</button>
  </div>;
  return <img key={attempt} src={attempt ? `${src}?retry=${attempt}` : src} alt={alt} className="scripture-plate-image" loading="eager" decoding="async" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={() => setFailed(true)} />;
}
export function ScripturePlate({ plate, compact = false }: Props) {
  const src = biblePlateAssetUrl(plate);
  return <figure data-reader-plate={plate.id} data-reader-artist={plate.artist} data-reader-visual-kind={plate.kind ?? "artwork"} data-reader-visual-id={plate.visualAssetId} className={cn("scripture-plate", compact ? "scripture-plate--compact" : "h-full min-h-0 flex flex-col")}>
    <div className={cn("scripture-plate-image-wrap", compact ? "relative w-full" : "relative flex-1 min-h-0 flex items-center justify-center")} style={compact ? { aspectRatio: "4 / 3" } : undefined}>
      <PlateImage key={src} src={src} alt={plate.alt} />
    </div>
    <figcaption className="scripture-plate-caption shrink-0">
      <span className="scripture-plate-title">{plate.title}</span>
      <span className="scripture-plate-ref"> {plate.referenceLabel}</span>
      {plate.artist ? <span className="scripture-plate-artist block text-[0.85em] opacity-80 mt-0.5">{plate.artist}{plate.sourceUrl ? <> · <a href={plate.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-100">Source</a></> : null}</span> : null}
      {plate.context ? <span className="block mt-1 text-[0.75em] leading-snug">
        <span className="block font-medium">{plate.context.label}</span>
        <span className="block">{plate.context.note}</span>
        <span className="block mt-1 opacity-80">{plate.context.credit} · {plate.context.licenseLabel}{plate.context.licenseUrl ? <> · <a href={plate.context.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">License</a></> : null} · Resized for the reader</span>
      </span> : null}
    </figcaption>
  </figure>;
}

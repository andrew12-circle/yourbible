import { useState } from "react";

type Props = { src: string; alt: string; detail?: boolean };
/** The keyed inner image resets failures when navigating between assets. */
export function VisualImage(props: Props) {
  return <ImageAttempt key={props.src} {...props} />;
}
function ImageAttempt({ src, alt, detail = false }: Props) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (failed) return <div role="status" className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center text-sm">
    <p>This image could not be loaded. Cached images remain available when offline.</p>
    <button type="button" className="min-h-11 rounded-md border px-4" onClick={() => { setAttempt((value) => value + 1); setFailed(false); }}>Retry image</button>
  </div>;
  const retrySrc = attempt ? `${src}${src.includes("?") ? "&" : "?"}retry=${attempt}` : src;
  return <img key={attempt} src={retrySrc} alt={alt} loading={detail ? "eager" : "lazy"} decoding="async"
    className={detail ? "block h-full w-full object-contain" : "h-full w-full object-contain p-2"}
    onError={() => setFailed(true)} />;
}

import { useState } from "react";

type Props = {
  src?: string;
  fallbackSrc?: string;
};

/** Keep scene cards illustrated while an uploaded cover is unavailable. */
export function SceneCoverImage({
  src,
  fallbackSrc = "/morning-scenes/peaceful-morning.webp",
}: Props) {
  const preferredSrc = src?.trim() || fallbackSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const displaySrc = failedSrc === preferredSrc ? fallbackSrc : preferredSrc;

  return (
    <img
      src={displaySrc}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      width={960}
      height={600}
      className="absolute inset-0 h-full w-full object-cover"
      onError={() => {
        if (displaySrc !== fallbackSrc) setFailedSrc(preferredSrc);
      }}
    />
  );
}

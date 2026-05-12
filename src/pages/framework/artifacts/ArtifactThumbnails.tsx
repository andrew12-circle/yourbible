import { useEffect, useMemo, useState } from "react";
import { BookOpen, type LucideIcon } from "lucide-react";
import { ICON_TILE, KIND_TILE, YT_THUMB_WRAP, youtubeThumbnailCandidates, type Row } from "./artifactLibraryModel";

export function KindIconTile({ kind }: { kind: string }) {
  const spec = KIND_TILE[kind] ?? { Icon: BookOpen, gradient: KIND_TILE.text.gradient };
  const Icon = spec.Icon as LucideIcon;
  return (
    <div className={ICON_TILE} style={{ background: spec.gradient }} aria-hidden>
      <Icon className="h-7 w-7 text-white" strokeWidth={2} style={spec.iconColor ? { color: spec.iconColor } : undefined} />
    </div>
  );
}

export function RowThumbnail({ artifactId, kind, url, metadata }: Pick<Row, "kind" | "url" | "metadata"> & { artifactId: string }) {
  const thumbUrls = useMemo(() => youtubeThumbnailCandidates(kind, url, metadata), [kind, url, metadata]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [artifactId, kind, url, metadata?.thumbnail_url]);

  if (kind === "youtube" && index < thumbUrls.length) {
    return (
      <div className={YT_THUMB_WRAP}>
        <img
          src={thumbUrls[index]}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setIndex((i) => i + 1)}
        />
      </div>
    );
  }

  return <KindIconTile kind={kind} />;
}

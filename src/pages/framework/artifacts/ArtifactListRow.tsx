import { Link } from "react-router-dom";
import { prepareArtifactNavigation } from "@/lib/framework/artifactShellCache";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  artifactDisplayTitle,
  channelAndAuthorLine,
  formatGuestsLabel,
  guestNamesForListRow,
  linkFullTitle,
  sourceLabelForRow,
  type Row,
} from "./artifactLibraryModel";
import { useMergedYoutubeRowMetadata } from "./useMergedYoutubeRowMetadata";
import { RowThumbnail } from "./ArtifactThumbnails";

export function MetaBlock({ r }: { r: Row }) {
  const mergedMeta = useMergedYoutubeRowMetadata(r);
  const dateStr = new Date(r.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const who = channelAndAuthorLine(mergedMeta);
  const source = sourceLabelForRow(r);
  const line1Core = who ? `${source} · ${who}` : source;
  const guestLine = formatGuestsLabel(guestNamesForListRow(mergedMeta));

  return (
    <div className="mt-1 space-y-0.5">
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <div className="min-w-0 flex-1 truncate leading-snug">{line1Core}</div>
        <div className="shrink-0 pt-px text-[11px] text-muted-foreground/85 tabular-nums">{dateStr}</div>
      </div>
      {guestLine ? (
        <div className="truncate text-[11px] leading-snug text-muted-foreground/90">{guestLine}</div>
      ) : null}
    </div>
  );
}

interface ArtifactListRowProps {
  r: Row;
  deletingId: string | null;
  onDelete: (id: string, title: string | null) => void;
  isUnwatched?: boolean;
}

export function ArtifactListRow({ r, deletingId, onDelete, isUnwatched = false }: ArtifactListRowProps) {
  const displayTitle = artifactDisplayTitle(r);
  const tip = linkFullTitle(r);
  const primeNavigation = () => prepareArtifactNavigation(r);
  return (
    <li>
      <div className="flex items-start gap-4 rounded-2xl border border-border bg-card/30 p-3 pr-2 shadow-sm transition-colors hover:bg-muted/25">
        <Link
          to={`/framework/artifacts/${r.id}`}
          className="shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          title={tip}
          onPointerEnter={primeNavigation}
          onClick={primeNavigation}
        >
          <RowThumbnail artifactId={r.id} kind={r.kind} url={r.url} metadata={r.metadata} />
        </Link>
        <Link
          to={`/framework/artifacts/${r.id}`}
          className="min-w-0 flex-1 pt-0.5 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          title={tip}
          onPointerEnter={primeNavigation}
          onClick={primeNavigation}
        >
          <div className="truncate font-bold text-[15px] leading-snug">{displayTitle}</div>
          <MetaBlock r={r} />
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5 sm:flex-row sm:items-start">
          {isUnwatched ? (
            <Badge className="text-[10px] font-semibold uppercase tracking-wider">New</Badge>
          ) : null}
          <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
            {r.status}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            disabled={deletingId === r.id}
            onClick={() => onDelete(r.id, r.title)}
            aria-label={`Delete ${r.title || "Untitled"}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

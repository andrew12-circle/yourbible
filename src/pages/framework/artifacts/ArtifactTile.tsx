import { memo, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  artifactDisplayTitle,
  channelAndAuthorLine,
  tileUsesWideAspect,
  trimStr,
  youtubeThumbnailCandidates,
  type Row,
} from "./artifactLibraryModel";
import { useMergedYoutubeRowMetadata } from "./useMergedYoutubeRowMetadata";
import { GeneratedCover } from "./GeneratedCover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

function generatedVariant(kind: string): "document" | "chat" | "voice" {
  if (kind === "chat_export") return "chat";
  if (kind === "voice" || kind === "audio") return "voice";
  return "document";
}

function YoutubeStack({ artifactId, url, metadata }: Pick<Row, "url" | "metadata"> & { artifactId: string }) {
  const thumbUrls = useMemo(() => youtubeThumbnailCandidates("youtube", url, metadata), [url, metadata]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
  }, [artifactId, url, metadata?.thumbnail_url]);
  if (index >= thumbUrls.length) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <span className="text-xs text-muted-foreground">No thumbnail</span>
      </div>
    );
  }
  return (
    <img
      src={thumbUrls[index]}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export interface ArtifactTileProps {
  r: Row;
  layout: "shelf" | "grid";
  deletingId: string | null;
  onDelete: (id: string, title: string | null) => void;
  onRename: (id: string) => void;
}

export const ArtifactTile = memo(function ArtifactTile({ r, layout, deletingId, onDelete, onRename }: ArtifactTileProps) {
  const navigate = useNavigate();
  const merged = useMergedYoutubeRowMetadata(r);
  const title = artifactDisplayTitle(r);
  const wide = tileUsesWideAspect(r.kind);
  const thumb = trimStr(merged?.thumbnail_url);
  const detailPath = `/framework/artifacts/${r.id}`;
  const shelfW = wide ? "w-[min(46vw,260px)] sm:w-[272px]" : "w-[min(34vw,158px)] sm:w-[168px]";
  const aspect = wide ? "aspect-video" : "aspect-[2/3]";
  const who = channelAndAuthorLine(merged);
  const ready = r.status === "ready";

  const cover = (() => {
    if (r.kind === "youtube") {
      return (
        <div className="relative h-full w-full">
          <YoutubeStack artifactId={r.id} url={r.url} metadata={merged ?? r.metadata} />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent"
            aria-hidden
          />
        </div>
      );
    }
    if (thumb) {
      return <img src={thumb} alt="" className="h-full w-full object-cover" />;
    }
    return <GeneratedCover artifactId={r.id} title={title} variant={generatedVariant(r.kind)} />;
  })();

  const open = () => navigate(detailPath);

  const tileBody = (
    <div
      className={cn(
        "group/tile relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)] transition-[transform,box-shadow,scale] duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_14px_32px_-14px_rgba(0,0,0,0.45)]",
        layout === "grid" ? "w-full" : shelfW,
      )}
    >
      <div className="pointer-events-none relative z-[1]">
        <div className={cn("relative overflow-hidden rounded-t-2xl", aspect)}>{cover}</div>
        {r.kind === "youtube" ? (
          <div className="border-t border-border/40 bg-gradient-to-b from-card/90 to-card/95 px-2.5 pb-2 pt-2">
            <div className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug tracking-tight">{title}</div>
            {who ? (
              <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{who}</div>
            ) : (
              <div className="mt-0.5 h-3.5" />
            )}
          </div>
        ) : (
          <div className="space-y-0.5 border-t border-border/40 bg-card/90 px-2.5 pb-2 pt-2">
            <div className="line-clamp-2 text-[12px] font-semibold leading-snug">{title}</div>
            {who ? <div className="line-clamp-1 text-[11px] text-muted-foreground">{who}</div> : null}
          </div>
        )}
      </div>
      <Link
        to={detailPath}
        className="absolute inset-0 z-10 rounded-2xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Open ${title}`}
      />
      {ready ? (
        <span className="pointer-events-none absolute left-2 top-2 z-[15] rounded-md bg-background/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm ring-1 ring-border/40 backdrop-blur-sm">
          Ready
        </span>
      ) : null}
      <div className="absolute right-1.5 top-1.5 z-20 pointer-events-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full border border-border/50 bg-background/85 text-foreground shadow-sm backdrop-blur-sm opacity-0 transition-opacity group-hover/tile:opacity-100 focus-visible:opacity-100"
              aria-label={`More actions for ${title}`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={open}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                onRename(r.id);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              disabled={deletingId === r.id}
              onSelect={() => onDelete(r.id, r.title)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{tileBody}</ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={open}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onRename(r.id)}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          disabled={deletingId === r.id}
          onSelect={() => onDelete(r.id, r.title)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

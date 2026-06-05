import { ExternalLink, RefreshCw } from "lucide-react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { ArtifactRow } from "@/lib/framework/artifactDetailCompare";
import type { ArtifactYoutubeLiveMeta } from "@/hooks/useArtifactYoutubeMetaRepair";

type ArtifactMetadata = ArtifactYoutubeLiveMeta & Record<string, unknown>;

type Props = {
  artifact: ArtifactRow;
  artifactMetadata: ArtifactMetadata;
  liveMeta: ArtifactYoutubeLiveMeta | null;
  refreshingMeta: boolean;
  setRefreshingMeta: (refreshing: boolean) => void;
  setLiveMeta: (meta: ArtifactYoutubeLiveMeta | null) => void;
  setA: Dispatch<SetStateAction<ArtifactRow | null>>;
  fetchYouTubeMeta: (videoUrl: string) => Promise<ArtifactYoutubeLiveMeta | null>;
  repairedRef: MutableRefObject<boolean>;
};

export default function ArtifactYoutubeMissingVideoCard({
  artifact,
  artifactMetadata,
  liveMeta,
  refreshingMeta,
  setRefreshingMeta,
  setLiveMeta,
  setA,
  fetchYouTubeMeta,
  repairedRef,
}: Props) {
  const meta: ArtifactMetadata = {
    ...(liveMeta ?? {}),
    ...Object.fromEntries(Object.entries(artifactMetadata).filter(([, v]) => v != null && v !== "")),
  };
  const thumb = meta.thumbnail_url || liveMeta?.thumbnail_url;
  const channel = meta.channel_title || liveMeta?.channel_title;
  const channelUrl = meta.channel_url || liveMeta?.channel_url;
  const provider = meta.provider_name || liveMeta?.provider_name || "YouTube";
  if (!thumb && !channel && !artifact.title) return null;

  return (
    <section className="mb-6 rounded-2xl border border-border/60 bg-card p-4 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]">
      <div className="flex items-center gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="h-16 w-28 rounded object-cover bg-muted flex-none" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">{provider}</div>
          <div className="font-medium truncate">{artifact.title || "Untitled video"}</div>
          {channel ? (
            <div className="text-sm text-muted-foreground truncate">
              by{" "}
              {channelUrl ? (
                <a
                  href={channelUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline inline-flex items-center gap-1"
                >
                  {channel}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                channel
              )}
            </div>
          ) : null}
        </div>
        {artifact.url ? (
          <Button
            size="sm"
            variant="ghost"
            className="self-start"
            disabled={refreshingMeta}
            onClick={async () => {
              if (!artifact.url) return;
              setRefreshingMeta(true);
              repairedRef.current = false;
              setLiveMeta(null);
              const nextMeta = await fetchYouTubeMeta(artifact.url);
              if (nextMeta) {
                setLiveMeta(nextMeta);
                const patch: Record<string, unknown> = {};
                if (nextMeta.title) patch.title = nextMeta.title;
                const prev = (artifact.metadata ?? {}) as Record<string, unknown>;
                const dbMeta = {
                  ...prev,
                  source: "youtube",
                  channel_title: nextMeta.channel_title ?? null,
                  channel_url: nextMeta.channel_url ?? null,
                  thumbnail_url: nextMeta.thumbnail_url ?? null,
                  provider_name: nextMeta.provider_name ?? "YouTube",
                };
                const tryWithMetadata = await supabase
                  .from("artifacts")
                  .update({ ...patch, metadata: dbMeta })
                  .eq("id", artifact.id);
                if (tryWithMetadata.error && Object.keys(patch).length > 0) {
                  await supabase.from("artifacts").update(patch as never).eq("id", artifact.id);
                }
                if (nextMeta.title) {
                  setA((prev) => (prev ? { ...prev, title: nextMeta.title ?? prev.title } : prev));
                }
                toast({ title: "Video info refreshed" });
              } else {
                toast({ title: "Could not fetch video info", variant: "destructive" });
              }
              setRefreshingMeta(false);
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshingMeta ? "animate-spin" : ""}`} /> Refresh
          </Button>
        ) : null}
      </div>
    </section>
  );
}

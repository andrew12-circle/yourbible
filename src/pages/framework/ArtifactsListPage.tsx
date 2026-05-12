import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Plus, Trash2, FileText, Mic, BookOpen, Youtube, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { getYouTubeVideoId, youtubeHqThumbnail, youtubeMqThumbnail } from "@/lib/youtube";

interface Row {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  created_at: string;
  url?: string | null;
  metadata?: {
    channel_title?: string | null;
    thumbnail_url?: string | null;
    provider_name?: string | null;
  } | null;
}

const ICON_TILE =
  "flex h-[72px] w-[72px] min-w-[72px] shrink-0 items-center justify-center rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_16px_-10px_rgba(0,0,0,0.45)]";

const KIND_TILE: Record<string, { Icon: LucideIcon; gradient: string; iconColor?: string }> = {
  text: {
    Icon: FileText,
    gradient: "linear-gradient(160deg, #4C46D1 0%, #6A63FF 58%, #8E8BFF 100%)",
  },
  voice: {
    Icon: Mic,
    gradient: "linear-gradient(160deg, #0FA958 0%, #28CC73 58%, #5AF0A6 100%)",
  },
  youtube: {
    Icon: Youtube,
    gradient: "linear-gradient(160deg, #CB3F2A 0%, #FF6E4E 60%, #FF9A63 100%)",
  },
};

function kindLabel(kind: string) {
  if (kind === "text") return "Text";
  if (kind === "voice") return "Voice";
  if (kind === "youtube") return "YouTube";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function KindIconTile({ kind }: { kind: string }) {
  const spec = KIND_TILE[kind] ?? { Icon: BookOpen, gradient: KIND_TILE.text.gradient };
  const Icon = spec.Icon;
  return (
    <div className={ICON_TILE} style={{ background: spec.gradient }} aria-hidden>
      <Icon className="h-7 w-7 text-white" strokeWidth={2} style={spec.iconColor ? { color: spec.iconColor } : undefined} />
    </div>
  );
}

function RowThumbnail({ artifactId, kind, url, metadata }: Pick<Row, "kind" | "url" | "metadata"> & { artifactId: string }) {
  const thumbUrls = useMemo(() => {
    if (kind !== "youtube") return [] as string[];
    const list: string[] = [];
    const meta = metadata?.thumbnail_url;
    if (meta) list.push(meta);
    const id = getYouTubeVideoId(url);
    if (id) {
      const mq = youtubeMqThumbnail(id);
      const hq = youtubeHqThumbnail(id);
      for (const u of [mq, hq]) {
        if (!list.includes(u)) list.push(u);
      }
    }
    return list;
  }, [kind, url, metadata?.thumbnail_url]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [artifactId, kind, url, metadata?.thumbnail_url]);

  if (kind === "youtube" && index < thumbUrls.length) {
    return (
      <img
        src={thumbUrls[index]}
        alt=""
        className="h-[72px] w-[72px] min-w-[72px] shrink-0 rounded-xl object-cover bg-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_16px_-10px_rgba(0,0,0,0.35)]"
        onError={() => setIndex((i) => i + 1)}
      />
    );
  }

  return <KindIconTile kind={kind} />;
}

function rowSubtitle(r: Row) {
  const dateStr = new Date(r.created_at).toLocaleDateString();
  if (r.kind === "youtube") {
    const provider = r.metadata?.provider_name?.trim() || "YouTube";
    const channel = r.metadata?.channel_title?.trim();
    const left = channel ? `${provider} · ${channel}` : provider;
    return `${left} · ${dateStr}`;
  }
  return `${kindLabel(r.kind)} · ${dateStr}`;
}

export default function ArtifactsListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const withMetadata = await supabase
        .from("artifacts")
        .select("id,title,kind,status,created_at,metadata,url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!withMetadata.error) {
        setRows((withMetadata.data as Row[]) ?? []);
        return;
      }
      const fallback = await supabase
        .from("artifacts")
        .select("id,title,kind,status,created_at,url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((fallback.data as Row[]) ?? []);
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const deleteArtifact = async (id: string, title: string | null) => {
    const confirmed = window.confirm(`Delete artifact "${title || "Untitled"}"? This cannot be undone.`);
    if (!confirmed) return;
    setDeletingId(id);
    const { error } = await supabase
      .from("artifacts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      setDeletingId(null);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
    setDeletingId(null);
    toast({ title: "Artifact deleted" });
  };

  return (
    <FrameworkLayout title="Artifacts" back="/framework">
      <div className="mb-4">
        <Button asChild size="sm">
          <Link to="/framework/artifacts/new">
            <Plus className="w-4 h-4 mr-1" /> New artifact
          </Link>
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No artifacts yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/30 p-3 pr-2 shadow-sm transition-colors hover:bg-muted/25">
                <Link to={`/framework/artifacts/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <RowThumbnail artifactId={r.id} kind={r.kind} url={r.url} metadata={r.metadata} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-[15px] leading-snug">{r.title || "Untitled"}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{rowSubtitle(r)}</div>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wider">
                    {r.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    disabled={deletingId === r.id}
                    onClick={() => deleteArtifact(r.id, r.title)}
                    aria-label={`Delete ${r.title || "Untitled"}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FrameworkLayout>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Layers, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import FrameworkLayout from "./FrameworkLayout";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { fetchSeenArtifactIds } from "@/lib/framework/artifactLibrarySeen";
import { syncYouTubeSubscriptions } from "@/lib/youtube/youtubeSubscriptions";
import {
  artifactDisplayTitle,
  filterRowsBySearch,
  isUnwatchedSubscriptionRow,
  readLibrarySortKey,
  readLibraryViewMode,
  RECENT_SHELF_LIMIT,
  rowMatchesLibraryCategory,
  sortRows,
  writeLibrarySortKey,
  writeLibraryViewMode,
  type LibraryCategoryId,
  type LibrarySortKey,
  type LibraryViewMode,
  type Row,
} from "./artifacts/artifactLibraryModel";
import { ArtifactsLibraryMobileMenu } from "./artifacts/ArtifactsLibraryMobileMenu";
import { LibraryToolbar } from "./artifacts/LibraryToolbar";
import { ArtifactShelf } from "./artifacts/ArtifactShelf";
import { ArtifactGrid } from "./artifacts/ArtifactGrid";
import { ArtifactListRow } from "./artifacts/ArtifactListRow";
import { ArtifactLibrarySkeleton } from "./artifacts/ArtifactLibrarySkeleton";

export default function ArtifactsListPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [listReady, setListReady] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<LibraryViewMode>(() => readLibraryViewMode());
  const [sortKey, setSortKey] = useState<LibrarySortKey>(() => readLibrarySortKey());
  const [category, setCategory] = useState<LibraryCategoryId>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 150);
    return () => window.clearTimeout(t);
  }, [search]);

  const reloadLibrary = useCallback(async () => {
    if (!user) return;
    setListReady(false);
    const withMetadata = await supabase
      .from("artifacts")
      .select("id,title,kind,status,created_at,metadata,url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!withMetadata.error) {
      setRows((withMetadata.data as Row[]) ?? []);
      setListReady(true);
      return;
    }
    const fallback = await supabase
      .from("artifacts")
      .select("id,title,kind,status,created_at,url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((fallback.data as Row[]) ?? []);
    setListReady(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void reloadLibrary();
    void fetchSeenArtifactIds(user.id).then((ids) => {
      if (!cancelled) setSeenIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [user, reloadLibrary]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void syncYouTubeSubscriptions()
      .then((imported) => {
        if (cancelled || imported <= 0) return;
        void reloadLibrary();
        toast({
          title: `${imported} new video${imported === 1 ? "" : "s"} from subscriptions`,
          description: "Find them in the Unwatched shelf.",
        });
      })
      .catch((e) => console.warn("[ArtifactsListPage] subscription sync", e));
    return () => {
      cancelled = true;
    };
  }, [user, reloadLibrary]);

  const setViewModePersist = useCallback((m: LibraryViewMode) => {
    setViewMode(m);
    writeLibraryViewMode(m);
  }, []);

  const setSortKeyPersist = useCallback((s: LibrarySortKey) => {
    setSortKey(s);
    writeLibrarySortKey(s);
  }, []);

  const searchFiltered = useMemo(() => filterRowsBySearch(rows, debouncedSearch), [rows, debouncedSearch]);

  const scopedRows = useMemo(() => {
    if (category === "all") return searchFiltered;
    return searchFiltered.filter((r) => rowMatchesLibraryCategory(r, category, seenIds));
  }, [searchFiltered, category, seenIds]);

  const sortedRows = useMemo(() => sortRows(scopedRows, sortKey), [scopedRows, sortKey]);

  const shelfData = useMemo(() => {
    const base = searchFiltered;
    const recent = sortRows(base, "recent").slice(0, RECENT_SHELF_LIMIT);
    const pick = (pred: (r: Row) => boolean) => sortRows(base.filter(pred), sortKey);
    return {
      recent,
      unwatched: pick((r) => isUnwatchedSubscriptionRow(r, seenIds)),
      videos: pick((r) => r.kind === "youtube"),
      podcasts: pick((r) => r.kind === "podcast"),
      documents: pick((r) => r.kind === "pdf" || r.kind === "text_file"),
      chats: pick((r) => r.kind === "chat_export"),
      notes: pick((r) => r.kind === "text"),
      voice: pick((r) => r.kind === "voice" || r.kind === "audio"),
    };
  }, [searchFiltered, sortKey, seenIds]);

  const shelfRowIdsKey = useMemo(
    () =>
      [
        shelfData.recent.map((r) => r.id).join(","),
        shelfData.unwatched.map((r) => r.id).join(","),
        shelfData.videos.map((r) => r.id).join(","),
        shelfData.podcasts.map((r) => r.id).join(","),
        shelfData.documents.map((r) => r.id).join(","),
        shelfData.chats.map((r) => r.id).join(","),
        shelfData.notes.map((r) => r.id).join(","),
        shelfData.voice.map((r) => r.id).join(","),
      ].join("|"),
    [shelfData],
  );

  const sortedRowIdsKey = useMemo(() => sortedRows.map((r) => r.id).join(","), [sortedRows]);

  const handleSeeAll = useCallback(
    (cat: LibraryCategoryId) => {
      if (cat === "all") return;
      setCategory(cat);
      setViewModePersist("grid");
    },
    [setViewModePersist],
  );

  const deleteArtifact = useCallback(
    async (id: string, title: string | null) => {
      if (!user) return;
      const confirmed = window.confirm(`Delete artifact "${title || "Untitled"}"? This cannot be undone.`);
      if (!confirmed) return;
      setDeletingId(id);
      const { error } = await supabase.from("artifacts").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "destructive" });
        setDeletingId(null);
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== id));
      setDeletingId(null);
      toast({ title: "Artifact deleted" });
    },
    [user],
  );

  const renameArtifact = useCallback(
    async (id: string) => {
      if (!user) return;
      const r = rows.find((x) => x.id === id);
      if (!r) return;
      const current = artifactDisplayTitle(r);
      const next = window.prompt("Rename artifact", current);
      if (next == null) return;
      const t = next.trim();
      if (!t || t === current) return;
      const { error } = await supabase.from("artifacts").update({ title: t }).eq("id", id).eq("user_id", user.id);
      if (error) {
        toast({ title: "Rename failed", description: error.message, variant: "destructive" });
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, title: t } : row)));
      toast({ title: "Artifact renamed" });
    },
    [user, rows],
  );

  const tileHandlers = useMemo(
    () => ({
      onDelete: deleteArtifact,
      onRename: renameArtifact,
    }),
    [deleteArtifact, renameArtifact],
  );

  const mobileMenuShell = (
    <ArtifactsLibraryMobileMenu
      open={mobileMenuOpen}
      onOpenChange={setMobileMenuOpen}
      showNewArtifact={false}
      viewMode={viewMode}
      onViewModeChange={setViewModePersist}
      sortKey={sortKey}
      onSortKeyChange={setSortKeyPersist}
      category={category}
      onCategoryChange={setCategory}
    />
  );

  if (loading) {
    return (
      <FrameworkLayout title="Artifacts" back="/framework" headerTrailing={mobileMenuShell}>
        <ArtifactLibrarySkeleton />
      </FrameworkLayout>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const showHeaderNew = listReady && rows.length > 0;

  const toolbar = (
    <LibraryToolbar
      search={search}
      onSearchChange={setSearch}
      viewMode={viewMode}
      onViewModeChange={setViewModePersist}
      sortKey={sortKey}
      onSortKeyChange={setSortKeyPersist}
      category={category}
      onCategoryChange={setCategory}
      showNewArtifact
    />
  );

  return (
    <FrameworkLayout
      title="Artifacts"
      back="/framework"
      contentClassName="max-w-[min(92rem,calc(100vw-1.25rem))]"
      headerContentClassName="max-w-[min(92rem,calc(100vw-1.25rem))]"
      headerTrailing={
        <ArtifactsLibraryMobileMenu
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          showNewArtifact={showHeaderNew}
          viewMode={viewMode}
          onViewModeChange={setViewModePersist}
          sortKey={sortKey}
          onSortKeyChange={setSortKeyPersist}
          category={category}
          onCategoryChange={setCategory}
        />
      }
    >
      {!listReady ? (
        <ArtifactLibrarySkeleton />
      ) : rows.length === 0 ? (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-6 rounded-3xl border border-border/60 bg-card/25 px-8 py-14 text-center shadow-sm">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight">Your library is empty</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Add sermons, transcripts, PDFs, and notes — they will appear here as browsable tiles.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="rounded-xl shadow-sm">
              <Link to="/framework/artifacts/new">
                <Plus className="mr-2 h-4 w-4" />
                New artifact
              </Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-xl border border-border/60 shadow-sm">
              <Link to="/framework/artifacts/new?mode=import">
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {toolbar}
          <Link
            to="/framework/library-standing"
            className="mt-6 flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm transition-colors hover:border-border hover:bg-card/70"
          >
            <Layers className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium text-foreground">Library standing</span>
              <span className="text-muted-foreground"> — see how every source compares to your beliefs and each other.</span>
            </span>
          </Link>
          {viewMode === "list" ? (
            <div className="mt-8 space-y-3">
              {sortedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching artifacts.</p>
              ) : (
                <ul key={sortedRowIdsKey} className="flex flex-col gap-3">
                  {sortedRows.map((r) => (
                    <ArtifactListRow
                      key={r.id}
                      r={r}
                      deletingId={deletingId}
                      onDelete={deleteArtifact}
                      isUnwatched={isUnwatchedSubscriptionRow(r, seenIds)}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : category !== "all" ? (
            <div className="mt-8">
              {sortedRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching artifacts.</p>
              ) : (
                <ArtifactGrid
                  key={sortedRowIdsKey}
                  rows={sortedRows}
                  deletingId={deletingId}
                  onDelete={tileHandlers.onDelete}
                  onRename={tileHandlers.onRename}
                  seenIds={seenIds}
                />
              )}
            </div>
          ) : (
            <div key={shelfRowIdsKey} className="mt-10 space-y-12">
              {shelfData.unwatched.length > 0 ? (
                <ArtifactShelf
                  shelfKey="unwatched"
                  title="Unwatched"
                  rows={shelfData.unwatched}
                  seeAllCategory="unwatched"
                  onSeeAll={handleSeeAll}
                  deletingId={deletingId}
                  onDelete={tileHandlers.onDelete}
                  onRename={tileHandlers.onRename}
                  seenIds={seenIds}
                />
              ) : null}
              <ArtifactShelf
                shelfKey="recent"
                title="Recently added"
                rows={shelfData.recent}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
              <ArtifactShelf
                shelfKey="videos"
                title="Videos"
                rows={shelfData.videos}
                seeAllCategory="videos"
                onSeeAll={handleSeeAll}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
              <ArtifactShelf
                shelfKey="podcasts"
                title="Podcasts"
                rows={shelfData.podcasts}
                seeAllCategory="podcasts"
                onSeeAll={handleSeeAll}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
              <ArtifactShelf
                shelfKey="documents"
                title="Documents"
                rows={shelfData.documents}
                seeAllCategory="documents"
                onSeeAll={handleSeeAll}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
              <ArtifactShelf
                shelfKey="chats"
                title="Conversations"
                rows={shelfData.chats}
                seeAllCategory="chats"
                onSeeAll={handleSeeAll}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
              <ArtifactShelf
                shelfKey="notes"
                title="Notes"
                rows={shelfData.notes}
                seeAllCategory="notes"
                onSeeAll={handleSeeAll}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
              <ArtifactShelf
                shelfKey="voice"
                title="Voice"
                rows={shelfData.voice}
                seeAllCategory="voice"
                onSeeAll={handleSeeAll}
                deletingId={deletingId}
                onDelete={tileHandlers.onDelete}
                onRename={tileHandlers.onRename}
                seenIds={seenIds}
              />
            </div>
          )}
        </>
      )}
    </FrameworkLayout>
  );
}

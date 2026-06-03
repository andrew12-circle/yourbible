import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Flame, Loader2, Search } from "lucide-react";
import { fetchPassage } from "@/lib/bible/api";
import { getStoredBibleId, LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { pickDefaultBibleId, useBibles } from "@/hooks/useBibles";
import { formatVerseReference, getVerseOfDayRef } from "@/lib/bible/verseOfDay";
import { useReadingStreak } from "@/hooks/useReadingActivity";
import { useAuth } from "@/contexts/AuthContext";
import { READING_PLANS } from "@/data/readingPlans";
import { BibleSearchDialog } from "@/components/bible/BibleSearchDialog";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function BibleHomeWidgets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const { data: bibles = [] } = useBibles();
  const [searchOpen, setSearchOpen] = useState(false);
  const bibleId = pickDefaultBibleId(bibles, getStoredBibleId()) || localStorage.getItem(LS_BIBLE_KEY) || "";
  const votd = getVerseOfDayRef();
  const { streak, isLoading: streakLoading } = useReadingStreak(user?.id);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const storedId = bibleId || getStoredBibleId();
    if (!storedId) {
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    fetchPassage(storedId, votd.book, votd.chapter)
      .then((p) => {
        if (cancelled) return;
        const verse = p.verses.find((v) => v.number === votd.verse);
        setPreview(verse?.text ?? null);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bibleId, votd.book, votd.chapter, votd.verse]);

  const featuredPlan = READING_PLANS[0];

  return (
    <div className="space-y-3 mb-3">
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        disabled={!online || !bibleId}
        className="w-full flex items-center gap-3 p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition disabled:opacity-60"
      >
        <Search className="w-4 h-4 text-zinc-700" aria-hidden />
        <span className="text-[15px] font-medium text-zinc-800">Search Scripture</span>
      </button>

      <button
        type="button"
        onClick={() => navigate(`/read/${votd.book}/${votd.chapter}?v=${votd.verse}`)}
        className="w-full text-left p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-800 mb-1.5">
          <BookOpen className="w-3.5 h-3.5" aria-hidden />
          Verse of the day
        </div>
        <p className="text-[13px] font-semibold text-zinc-800">{formatVerseReference(votd)}</p>
        {previewLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mt-2" aria-label="Loading verse" />
        ) : (
          <p className="text-[15px] font-medium leading-snug text-zinc-900 mt-1 line-clamp-3">
            {preview ?? "Open to read today's verse."}
          </p>
        )}
      </button>

      {user && (
        <div className="p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-800 mb-1">
                <Flame className="w-3.5 h-3.5" aria-hidden />
                Reading streak
              </div>
              <p className="text-2xl font-bold tabular-nums text-zinc-900">
                {streakLoading ? "…" : streak}
                <span className="text-sm font-medium text-zinc-600 ml-1">
                  {streak === 1 ? "day" : "days"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/reading-plans")}
              className="text-xs font-semibold text-primary px-3 py-2 rounded-full bg-white/80 border border-white/70"
            >
              Plans
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("/reading-plans")}
        className="w-full text-left p-4 rounded-[22px] bg-white/55 backdrop-blur-2xl border border-white/60 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] active:scale-[0.985] transition"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800 mb-1.5">
          Reading plan
        </div>
        <p className="text-[15px] font-medium leading-snug text-zinc-900">{featuredPlan.title}</p>
        <p className="text-xs text-zinc-600 mt-1">{featuredPlan.days} days · Browse all plans</p>
      </button>

      <BibleSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} bibleId={bibleId} />
    </div>
  );
}

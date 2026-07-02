import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { BookScene } from "@/components/bible/BookScene";
import { BibleContentsPage } from "@/components/bible/BibleContentsPage";
import { TopBar } from "@/components/bible/TopBar";
import { ReaderFloatingTabBar } from "@/components/bible/ReaderFloatingTabBar";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { useReaderSpread, useReaderCompactChrome } from "@/hooks/use-reader-layout";
import {
  hubReaderInline,
  readReaderHubFullscreen,
  readerOverlayPosition,
  readerPageTurnTopOffsetClass,
  readerSceneTopOffsetClass,
  writeReaderHubFullscreen,
} from "@/lib/bible/readerHubLayout";
import {
  leatherCoverClass,
  pageToneClass,
  coverStyle as buildCoverStyle,
} from "@/lib/bible/readerAppearance";
import { pageHorizontalPadding } from "@/lib/bible/readerPageMargins";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import { BOOKS } from "@/data/books";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { cn } from "@/lib/utils";
import { useBibleScrollWheel } from "@/hooks/useBibleScrollWheel";

import {
  clampReaderFontScale,
  readStoredReaderFontScale,
  writeStoredReaderFontScale,
} from "@/lib/bible/readerFontScale";
const defaultBook = BOOKS[0]!;

export default function ContentsReaderPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { showHubShell } = useAppShellMode();
  const [hubFullscreen, setHubFullscreen] = useState(readReaderHubFullscreen);
  const containedInHub = showHubShell && !hubFullscreen;
  const overlayPos = readerOverlayPosition(containedInHub);
  const readerSpread = useReaderSpread();
  const compactChrome = useReaderCompactChrome();
  const effectiveSpread = readerSpread && !compactChrome;
  const showReaderDock = !showHubShell && compactChrome;
  const hubInline = hubReaderInline(showHubShell, hubFullscreen);

  const { data: bibles = [] } = useBibles();
  const [bibleId, setBibleId] = useState<string>(() => localStorage.getItem(LS_BIBLE_KEY) ?? "");
  const [fontScale, setFontScale] = useState(() => readStoredReaderFontScale());

  useEffect(() => {
    if (bibles.length === 0) return;
    const next = pickDefaultBibleId(bibles, bibleId || localStorage.getItem(LS_BIBLE_KEY));
    if (next && next !== bibleId) {
      setBibleId(next);
      localStorage.setItem(LS_BIBLE_KEY, next);
    }
  }, [bibles, bibleId]);

  const readerPageClass = useMemo(
    () => pageToneClass(profile?.page_tone),
    [profile?.page_tone],
  );
  const readerCoverStyle = buildCoverStyle(profile?.cover);
  const readerCoverClass = leatherCoverClass(profile?.cover);

  const onSelectBook = useCallback(
    (bookAbbr: string, chapter = 1) => {
      navigate(`/read/${bookAbbr}/${chapter}`);
    },
    [navigate],
  );

  const onSelectStudySection = useCallback(
    (sectionId: string) => {
      navigate(`/read/study/${sectionId}`);
    },
    [navigate],
  );

  const toggleHubFullscreen = useCallback(() => {
    setHubFullscreen((prev) => {
      const next = !prev;
      writeReaderHubFullscreen(next);
      return next;
    });
  }, []);

  useBibleScrollWheel(true, "contents");

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;

  const pagePadding = effectiveSpread
    ? undefined
    : { paddingLeft: "clamp(1.125rem, 4vmin, 2.25rem)", paddingRight: "clamp(1.125rem, 4vmin, 2.25rem)" };

  const renderContentsFace = (testament: "ot" | "nt" | "all", side: "left" | "right" = "left") => (
    <div
      className={cn(
        "relative flex flex-col h-full min-h-0 overflow-hidden bg-paper pt-10 pb-2",
        readerPageClass,
      )}
      style={
        testament === "all"
          ? pagePadding
          : pageHorizontalPadding(side, !effectiveSpread, compactChrome)
      }
    >
      <div className="flex-shrink-0 text-left">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">
          Contents
        </span>
      </div>
      <div className="relative block flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain mt-2 scrollbar-hide" data-bible-scroll>
        {testament === "all" ? (
          <BibleContentsPage onSelectBook={onSelectBook} onSelectStudySection={onSelectStudySection} />
        ) : testament === "ot" ? (
          <BibleContentsPage
            onSelectBook={onSelectBook}
            onSelectStudySection={onSelectStudySection}
            className="bible-toc-page-single-testament"
            testamentFilter="ot"
          />
        ) : (
          <BibleContentsPage
            onSelectBook={onSelectBook}
            onSelectStudySection={onSelectStudySection}
            className="bible-toc-page-single-testament"
            testamentFilter="nt"
          />
        )}
      </div>
    </div>
  );

  return (
    <div
      data-bible-reader
      data-cropped-spread={!effectiveSpread ? "" : undefined}
      data-hub-fullscreen={hubFullscreen || undefined}
      className={cn(
        "relative transition-all duration-700 overflow-hidden",
        (containedInHub || !showHubShell || hubFullscreen) && "flex h-full min-h-0 flex-col",
        showHubShell && hubFullscreen && "fixed inset-0 z-[100] min-h-0 h-[100dvh] bg-fabric",
        !showHubShell && "h-[100dvh]",
      )}
    >
      <TopBar
        reference="Contents"
        collapsed={false}
        focusMode={false}
        onToggleFocus={() => {}}
        bibleId={bibleId}
        bibles={bibles}
        onChangeBible={(id) => {
          setBibleId(id);
          localStorage.setItem(LS_BIBLE_KEY, id);
        }}
        onBookmark={() => navigate("/read/Jhn/1")}
        currentBook={defaultBook}
        currentChapter={1}
        currentVerseCount={1}
        onJumpTo={(b, c) => navigate(`/read/${b.abbr}/${c}`)}
        fontScale={fontScale}
        onFontScaleChange={(next) => {
          const clamped = clampReaderFontScale(next);
          setFontScale(clamped);
          writeStoredReaderFontScale(clamped);
        }}
        singlePage={compactChrome}
        containedInHub={containedInHub}
        hubCompactChrome={hubInline}
        hubFullscreen={hubFullscreen}
        onToggleHubFullscreen={showHubShell ? toggleHubFullscreen : undefined}
      />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          overlayPos,
          "inset-x-0",
          readerSceneTopOffsetClass(compactChrome, hubInline),
          showReaderDock
            ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+env(safe-area-inset-bottom,0px))]"
            : "bottom-0",
        )}
      >
        <BookScene
          progress={0}
          singlePage={!effectiveSpread}
          tabletPortrait={false}
          fillContainer
          fabricSurround={showHubShell}
          hubInline={hubInline}
          coverStyle={readerCoverStyle}
          coverClassName={readerCoverClass}
          pageClassName={readerPageClass}
          leftPage={renderContentsFace("ot", "left")}
          rightPage={renderContentsFace("nt", "right")}
        />
      </div>

      {showReaderDock ? <ReaderFloatingTabBar bibleTo="/read/Jhn/1" /> : null}
    </div>
  );
}

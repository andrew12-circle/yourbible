import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { BookScene } from "@/components/bible/BookScene";
import { StudyConcordanceSearch } from "@/components/bible/StudyConcordanceSearch";
import { TopBar } from "@/components/bible/TopBar";
import { useBibles, pickDefaultBibleId } from "@/hooks/useBibles";
import { useReaderSpread, useReaderCompactChrome } from "@/hooks/use-reader-layout";
import {
  leatherCoverClass,
  pageToneClass,
  coverStyle as buildCoverStyle,
} from "@/lib/bible/readerAppearance";
import { pageHorizontalPadding } from "@/lib/bible/readerPageMargins";
import { LS_BIBLE_KEY } from "@/lib/bible/storedBibleId";
import {
  STUDY_MAPS,
  studyBackMatterSection,
  type StudyBackMatterSectionId,
} from "@/lib/bible/studyBackMatter";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { BOOKS } from "@/data/books";

const VALID_SECTIONS = new Set<string>([
  "preface",
  "features",
  "weights",
  "abbrev",
  "concordance",
  "maps",
]);

export default function StudyBackMatterPage() {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const readerSpread = useReaderSpread();
  const compactChrome = useReaderCompactChrome();
  const effectiveSpread = readerSpread && !compactChrome;

  const { data: bibles = [] } = useBibles();
  const [bibleId, setBibleId] = useState(() => localStorage.getItem(LS_BIBLE_KEY) ?? "");

  useEffect(() => {
    if (bibles.length === 0) return;
    const next = pickDefaultBibleId(bibles, bibleId || localStorage.getItem(LS_BIBLE_KEY));
    if (next && next !== bibleId) {
      setBibleId(next);
      localStorage.setItem(LS_BIBLE_KEY, next);
    }
  }, [bibles, bibleId]);

  const studySection = section && VALID_SECTIONS.has(section)
    ? studyBackMatterSection(section as StudyBackMatterSectionId)
    : undefined;

  const readerPageClass = useMemo(() => pageToneClass(profile?.page_tone), [profile?.page_tone]);
  const readerCoverStyle = buildCoverStyle(profile?.cover);
  const readerCoverClass = leatherCoverClass(profile?.cover);
  const defaultBook = BOOKS[0]!;

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;
  if (!studySection) return <Navigate to="/read/contents" replace />;

  const pagePadding = effectiveSpread
    ? undefined
    : { paddingLeft: "clamp(1.125rem, 4vmin, 2.25rem)", paddingRight: "clamp(1.125rem, 4vmin, 2.25rem)" };

  const pageBody = (
    <div
      className={cn(
        "relative flex flex-col h-full min-h-0 overflow-hidden bg-paper pt-10 pb-2",
        readerPageClass,
      )}
      style={pagePadding ?? pageHorizontalPadding("left", !effectiveSpread, compactChrome)}
    >
      <div className="flex-shrink-0 text-left">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-medium">
          Study Bible
        </span>
      </div>
      <article
        className="study-back-matter-page font-scripture selectable-text relative block flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain mt-2 scrollbar-hide"
        data-bible-scroll
      >
        <h1 className="study-back-matter-title">{studySection.title}</h1>
        {studySection.subtitle ? (
          <p className="study-back-matter-subtitle">{studySection.subtitle}</p>
        ) : null}
        <div
          className="study-back-matter-body"
          dangerouslySetInnerHTML={{ __html: studySection.bodyHtml }}
        />
        {studySection.id === "concordance" && bibleId ? (
          <StudyConcordanceSearch bibleId={bibleId} />
        ) : null}
        {studySection.id === "maps" ? (
          <div className="study-maps-grid mt-6">
            {STUDY_MAPS.map((map) => (
              <figure key={map.id} className="study-map-figure">
                <img src={map.imageUrl} alt={map.alt} className="study-map-image" loading="lazy" />
                <figcaption className="study-map-caption">
                  <strong>{map.title}</strong>
                  <span>{map.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );

  return (
    <div
      data-bible-reader
      className={cn("relative transition-all duration-700 overflow-hidden flex min-h-0 flex-col h-[100dvh]")}
    >
      <TopBar
        reference={studySection.title}
        collapsed={false}
        focusMode={false}
        onToggleFocus={() => {}}
        bibleId={bibleId}
        bibles={bibles}
        onChangeBible={(id) => {
          setBibleId(id);
          localStorage.setItem(LS_BIBLE_KEY, id);
        }}
        onBookmark={() => navigate("/read/contents")}
        currentBook={defaultBook}
        currentChapter={1}
        currentVerseCount={1}
        onJumpTo={(b, c) => navigate(`/read/${b.abbr}/${c}`)}
        singlePage={compactChrome}
      />
      <div className="flex min-h-0 flex-1 flex-col inset-x-0 bottom-0">
        <BookScene
          progress={0}
          singlePage
          tabletPortrait={false}
          fillContainer
          coverStyle={readerCoverStyle}
          coverClassName={readerCoverClass}
          pageClassName={readerPageClass}
          leftPage={pageBody}
          rightPage={null}
        />
      </div>
    </div>
  );
}

import { lazy, Suspense } from "react";
import { createMemoryRouter, Navigate, Outlet, type RouteObject } from "react-router-dom";
import AppRouteFallback from "@/components/AppRouteFallback";
import ArtifactDetailErrorBoundary from "@/components/framework/ArtifactDetailErrorBoundary";
import { MiniPhoneRoutePersist } from "@/components/mini-phone/MiniPhoneRoutePersist";
import { MiniPhoneYouTubePage } from "@/components/mini-phone/MiniPhoneYouTubePage";

const ReaderPage = lazy(() => import("@/pages/reader/ReaderPage"));
const ContentsReaderPage = lazy(() => import("@/pages/reader/ContentsReaderPage"));
const SettingsPage = lazy(() => import("@/pages/settings/SettingsPage"));
const SleepPage = lazy(() => import("@/pages/sleep/SleepPage"));
const FrameworkDashboard = lazy(() => import("@/pages/framework/FrameworkDashboard"));
const FaithJourneyPage = lazy(() => import("@/pages/framework/FaithJourneyPage"));
const InterviewPage = lazy(() => import("@/pages/framework/InterviewPage"));
const BeliefsListPage = lazy(() => import("@/pages/framework/BeliefsListPage"));
const BeliefDetailPage = lazy(() => import("@/pages/framework/BeliefDetailPage"));
const ArtifactsListPage = lazy(() => import("@/pages/framework/ArtifactsListPage"));
const LibraryStandingPage = lazy(() => import("@/pages/framework/LibraryStandingPage"));
const NewArtifactPage = lazy(() => import("@/pages/framework/NewArtifactPage"));
const ArtifactDetailPage = lazy(() => import("@/pages/framework/ArtifactDetailPage"));
const ClaimResearchWorkspacePage = lazy(() => import("@/pages/framework/ClaimResearchWorkspacePage"));
const LiveStreamPage = lazy(() => import("@/pages/framework/LiveStreamPage"));
const ResearchLaterPage = lazy(() => import("@/pages/framework/ResearchLaterPage"));
const HardQuestionsListPage = lazy(() => import("@/pages/framework/hardQuestions/HardQuestionsListPage"));
const HardQuestionNewPage = lazy(() => import("@/pages/framework/hardQuestions/HardQuestionNewPage"));
const HardQuestionWorkspacePage = lazy(() => import("@/pages/framework/hardQuestions/HardQuestionWorkspacePage"));
const BeliefGraphPage = lazy(() => import("@/pages/framework/BeliefGraphPage"));
const MindGraphPage = lazy(() => import("@/pages/framework/MindGraphPage"));
const PlaybookPage = lazy(() => import("@/pages/framework/PlaybookPage"));
const PlaybookDetailPage = lazy(() => import("@/pages/framework/PlaybookDetailPage"));
const TensionsPage = lazy(() => import("@/pages/framework/TensionsPage"));
const InfluencesPage = lazy(() => import("@/pages/framework/InfluencesPage"));
const DigestPage = lazy(() => import("@/pages/framework/DigestPage"));
const ChatPage = lazy(() => import("@/pages/framework/ChatPage"));
const StudyPage = lazy(() => import("@/pages/framework/StudyPage"));
const DailyPage = lazy(() => import("@/pages/framework/DailyPage"));
const JournalPage = lazy(() => import("@/pages/journal/JournalPage"));
const JournalCalendarPage = lazy(() => import("@/pages/journal/JournalCalendarPage"));
const JournalEntryPage = lazy(() => import("@/pages/journal/JournalEntryPage"));
const NewJournalEntryPage = lazy(() => import("@/pages/journal/NewJournalEntryPage"));
const JournalMirrorPage = lazy(() => import("@/pages/journal/JournalMirrorPage"));
const JournalMediaPage = lazy(() => import("@/pages/journal/JournalMediaPage"));
const JournalMapPage = lazy(() => import("@/pages/journal/JournalMapPage"));
const JournalGraphPage = lazy(() => import("@/pages/journal/JournalGraphPage"));
const JournalPromptsPage = lazy(() => import("@/pages/journal/JournalPromptsPage"));
const JournalTodayPage = lazy(() => import("@/pages/journal/JournalTodayPage"));
const JournalLifePage = lazy(() => import("@/pages/journal/JournalLifePage"));
const JournalVentPage = lazy(() => import("@/pages/journal/JournalVentPage"));
const JournalChatPage = lazy(() => import("@/pages/journal/JournalChatPage"));
const MyAiPage = lazy(() => import("@/pages/myai/MyAiPage"));
const PartnerWalkPage = lazy(() => import("@/pages/partner/PartnerWalkPage"));
const LifeWeeksPage = lazy(() => import("@/pages/life/LifeWeeksPage"));
const LifePrioritiesPage = lazy(() => import("@/pages/life/LifePrioritiesPage"));
const HabitsPage = lazy(() => import("@/pages/life/HabitsPage"));
const TodosPage = lazy(() => import("@/pages/life/TodosPage"));
const ReadingPlansPage = lazy(() => import("@/pages/bible/ReadingPlansPage"));
const LifeGuidePage = lazy(() => import("@/pages/bible/LifeGuidePage"));
const CodeLabPage = lazy(() => import("@/pages/bible/CodeLabPage"));
const LivingHopeHubPage = lazy(() => import("@/pages/living-hope/LivingHopeHubPage"));
const FutureLetterPage = lazy(() => import("@/pages/living-hope/FutureLetterPage"));
const MorningReviewPage = lazy(() => import("@/pages/living-hope/MorningReviewPage"));
const WorkbookSectionPage = lazy(() => import("@/pages/living-hope/WorkbookSectionPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function MiniPhoneRouteLayout() {
  return (
    <Suspense fallback={<AppRouteFallback />}>
      <MiniPhoneRoutePersist />
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <Outlet />
      </div>
    </Suspense>
  );
}

const miniPhoneChildRoutes: RouteObject[] = [
  { path: "/phone/youtube", element: <MiniPhoneYouTubePage /> },
  { path: "/read/contents", element: <ContentsReaderPage /> },
  { path: "/read/:book/:chapter", element: <ReaderPage /> },
  { path: "/bible/life-guide", element: <LifeGuidePage /> },
  { path: "/bible/code-lab", element: <CodeLabPage /> },
  { path: "/my-ai", element: <MyAiPage /> },
  { path: "/my-ai/:chatId", element: <MyAiPage /> },
  { path: "/partner", element: <PartnerWalkPage /> },
  { path: "/reading-plans", element: <ReadingPlansPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/sleep", element: <SleepPage /> },
  { path: "/living-hope", element: <LivingHopeHubPage /> },
  { path: "/living-hope/letter", element: <FutureLetterPage /> },
  { path: "/living-hope/review", element: <MorningReviewPage /> },
  { path: "/living-hope/workbook/:section", element: <WorkbookSectionPage /> },
  { path: "/life-weeks", element: <LifeWeeksPage /> },
  { path: "/life/priorities", element: <LifePrioritiesPage /> },
  { path: "/life/habits", element: <HabitsPage /> },
  { path: "/life/todos", element: <TodosPage /> },
  { path: "/todos", element: <Navigate to="/life/todos" replace /> },
  { path: "/framework", element: <FrameworkDashboard /> },
  { path: "/framework/journey", element: <FaithJourneyPage /> },
  { path: "/framework/playbook", element: <PlaybookPage /> },
  { path: "/framework/playbook/:id", element: <PlaybookDetailPage /> },
  { path: "/framework/interview/:layer", element: <InterviewPage /> },
  { path: "/framework/beliefs", element: <BeliefsListPage /> },
  { path: "/framework/beliefs/:id", element: <BeliefDetailPage /> },
  { path: "/framework/graph", element: <MindGraphPage /> },
  { path: "/framework/graph/beliefs", element: <BeliefGraphPage /> },
  { path: "/framework/tensions", element: <TensionsPage /> },
  { path: "/framework/influences", element: <InfluencesPage /> },
  { path: "/framework/digest", element: <DigestPage /> },
  { path: "/framework/chat", element: <Navigate to="/my-ai" replace /> },
  { path: "/framework/chat/legacy", element: <ChatPage /> },
  { path: "/framework/study", element: <StudyPage /> },
  { path: "/framework/daily", element: <DailyPage /> },
  { path: "/framework/live", element: <Navigate to="/framework/artifacts/live" replace /> },
  { path: "/journal", element: <JournalPage /> },
  { path: "/journal/j/:journalId", element: <JournalPage /> },
  { path: "/journal/j/:journalId/e/:entryId", element: <JournalPage /> },
  { path: "/journal/e/:entryId", element: <JournalPage /> },
  { path: "/journal/calendar", element: <JournalCalendarPage /> },
  { path: "/journal/j/:journalId/calendar", element: <JournalCalendarPage /> },
  { path: "/journal/media", element: <JournalMediaPage /> },
  { path: "/journal/j/:journalId/media", element: <JournalMediaPage /> },
  { path: "/journal/map", element: <JournalMapPage /> },
  { path: "/journal/j/:journalId/map", element: <JournalMapPage /> },
  { path: "/journal/graph", element: <JournalGraphPage /> },
  { path: "/journal/j/:journalId/graph", element: <JournalGraphPage /> },
  { path: "/journal/mirror", element: <JournalMirrorPage /> },
  { path: "/journal/prompts", element: <JournalPromptsPage /> },
  { path: "/journal/today", element: <JournalTodayPage /> },
  { path: "/journal/life", element: <JournalLifePage /> },
  { path: "/journal/life/:kind", element: <JournalLifePage /> },
  { path: "/journal/vent", element: <JournalVentPage /> },
  { path: "/journal/chat", element: <JournalChatPage /> },
  { path: "/journal/chat/:entryId", element: <JournalChatPage /> },
  { path: "/journal/new", element: <NewJournalEntryPage /> },
  { path: "/journal/:id", element: <JournalEntryPage /> },
  { path: "/journal/:id/edit", element: <NewJournalEntryPage /> },
  { path: "/framework/artifacts", element: <ArtifactsListPage /> },
  { path: "/framework/library-standing", element: <LibraryStandingPage /> },
  { path: "/framework/artifacts/new", element: <NewArtifactPage /> },
  { path: "/framework/artifacts/live", element: <LiveStreamPage /> },
  {
    path: "/framework/artifacts/:id",
    element: (
      <ArtifactDetailErrorBoundary>
        <ArtifactDetailPage />
      </ArtifactDetailErrorBoundary>
    ),
  },
  {
    path: "/framework/artifacts/:id/research/:claimId",
    element: (
      <ArtifactDetailErrorBoundary>
        <ClaimResearchWorkspacePage />
      </ArtifactDetailErrorBoundary>
    ),
  },
  { path: "/framework/research-later", element: <ResearchLaterPage /> },
  { path: "/framework/hard-questions", element: <HardQuestionsListPage /> },
  { path: "/framework/hard-questions/new", element: <HardQuestionNewPage /> },
  { path: "/framework/hard-questions/:id", element: <HardQuestionWorkspacePage /> },
  { path: "*", element: <NotFound /> },
];

/** Isolated memory router for the mini phone (must not nest inside BrowserRouter). */
export function createMiniPhoneRouter(initialEntry: string) {
  return createMemoryRouter(
    [
      {
        element: <MiniPhoneRouteLayout />,
        children: miniPhoneChildRoutes,
      },
    ],
    { initialEntries: [initialEntry], initialIndex: 0 },
  );
}

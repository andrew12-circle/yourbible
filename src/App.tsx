import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import AppRouteFallback from "@/components/AppRouteFallback";
import OfflineBanner from "@/components/OfflineBanner";
import { PwaUpdatePrompt } from "@/components/PwaUpdatePrompt";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalMediaPlayerProvider } from "@/contexts/GlobalMediaPlayerContext";
import { LifeWeekReviewProvider } from "@/contexts/LifeWeekReviewContext";
import { JournalVideoLaunchProvider } from "@/contexts/JournalVideoLaunchContext";
import { LifeWeekReviewGate } from "@/components/life/LifeWeekReviewGate";
import { JournalVideoUploadRetry } from "@/components/journal/JournalVideoUploadRetry";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ArtifactDetailErrorBoundary from "./components/framework/ArtifactDetailErrorBoundary";
import { ShellGate } from "@/components/shell/ShellGate";
import { GlobalJournalQuickCapture } from "@/hooks/useGlobalJournalQuickCapture";

const HomePage = lazy(() => import("./pages/HomePage"));
const AuthPage = lazy(() => import("./pages/auth/AuthPage"));
const AuthResetPage = lazy(() => import("./pages/auth/AuthResetPage"));
const PrivacyPage = lazy(() => import("./pages/legal/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/legal/TermsPage"));
const OnboardingPage = lazy(() => import("./pages/onboarding/OnboardingPage"));
const ReaderPage = lazy(() => import("./pages/reader/ReaderPage"));
const ContentsReaderPage = lazy(() => import("./pages/reader/ContentsReaderPage"));
const StudyBackMatterPage = lazy(() => import("./pages/reader/StudyBackMatterPage"));
const LifeGuidePage = lazy(() => import("./pages/bible/LifeGuidePage"));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage"));
const SleepPage = lazy(() => import("./pages/sleep/SleepPage"));
const FrameworkDashboard = lazy(() => import("./pages/framework/FrameworkDashboard"));
const FaithJourneyPage = lazy(() => import("./pages/framework/FaithJourneyPage"));
const InterviewPage = lazy(() => import("./pages/framework/InterviewPage"));
const BeliefsListPage = lazy(() => import("./pages/framework/BeliefsListPage"));
const BeliefDetailPage = lazy(() => import("./pages/framework/BeliefDetailPage"));
const ArtifactsListPage = lazy(() => import("./pages/framework/ArtifactsListPage"));
const LibraryStandingPage = lazy(() => import("./pages/framework/LibraryStandingPage"));
const NewArtifactPage = lazy(() => import("./pages/framework/NewArtifactPage"));
const ArtifactDetailPage = lazy(() => import("./pages/framework/ArtifactDetailPage"));
const ClaimResearchWorkspacePage = lazy(() => import("./pages/framework/ClaimResearchWorkspacePage"));
const LiveStreamPage = lazy(() => import("./pages/framework/LiveStreamPage"));
const ResearchLaterPage = lazy(() => import("./pages/framework/ResearchLaterPage"));
const HardQuestionsListPage = lazy(() => import("./pages/framework/hardQuestions/HardQuestionsListPage"));
const HardQuestionNewPage = lazy(() => import("./pages/framework/hardQuestions/HardQuestionNewPage"));
const HardQuestionWorkspacePage = lazy(() => import("./pages/framework/hardQuestions/HardQuestionWorkspacePage"));
const QuestionsForGodListPage = lazy(() => import("./pages/framework/questionsForGod/QuestionsForGodListPage"));
const QuestionForGodNewPage = lazy(() => import("./pages/framework/questionsForGod/QuestionForGodNewPage"));
const QuestionForGodDetailPage = lazy(() => import("./pages/framework/questionsForGod/QuestionForGodDetailPage"));
const BeliefGraphPage = lazy(() => import("./pages/framework/BeliefGraphPage"));
const MindGraphPage = lazy(() => import("./pages/framework/MindGraphPage"));
const PlaybookPage = lazy(() => import("./pages/framework/PlaybookPage"));
const PlaybookDetailPage = lazy(() => import("./pages/framework/PlaybookDetailPage"));
const TensionsPage = lazy(() => import("./pages/framework/TensionsPage"));
const InfluencesPage = lazy(() => import("./pages/framework/InfluencesPage"));
const DigestPage = lazy(() => import("./pages/framework/DigestPage"));
const ChatPage = lazy(() => import("./pages/framework/ChatPage"));
const StudyPage = lazy(() => import("./pages/framework/StudyPage"));
const DailyPage = lazy(() => import("./pages/framework/DailyPage"));
const JournalNotesPage = lazy(() => import("./pages/journal/JournalNotesPage"));
const JournalPage = lazy(() => import("./pages/journal/JournalPage"));
const JournalCalendarPage = lazy(() => import("./pages/journal/JournalCalendarPage"));
const JournalEntryPage = lazy(() => import("./pages/journal/JournalEntryPage"));
const NewJournalEntryPage = lazy(() => import("./pages/journal/NewJournalEntryPage"));
const JournalMirrorPage = lazy(() => import("./pages/journal/JournalMirrorPage"));
const JournalMediaPage = lazy(() => import("./pages/journal/JournalMediaPage"));
const JournalMapPage = lazy(() => import("./pages/journal/JournalMapPage"));
const JournalGraphPage = lazy(() => import("./pages/journal/JournalGraphPage"));
const JournalPromptsPage = lazy(() => import("./pages/journal/JournalPromptsPage"));
const JournalTodayPage = lazy(() => import("./pages/journal/JournalTodayPage"));
const JournalLifePage = lazy(() => import("./pages/journal/JournalLifePage"));
const JournalVentPage = lazy(() => import("./pages/journal/JournalVentPage"));
const JournalChatPage = lazy(() => import("./pages/journal/JournalChatPage"));
const HomeIndicator = lazy(() => import("./components/HomeIndicator"));
const GlobalJournalLauncher = lazy(() => import("./components/journal/GlobalJournalLauncher"));
const GlobalMediaPlayerHost = lazy(() =>
  import("./components/media/GlobalMediaPlayerHost").then((mod) => ({ default: mod.GlobalMediaPlayerHost })),
);
const GlobalArtifactVideoPip = lazy(() => import("./components/framework/GlobalArtifactVideoPip"));
const MyAiPage = lazy(() => import("./pages/myai/MyAiPage"));
const PartnerWalkPage = lazy(() => import("./pages/partner/PartnerWalkPage"));
const PartnerAcceptPage = lazy(() => import("./pages/partner/PartnerAcceptPage"));
const LifeWeeksPage = lazy(() => import("./pages/life/LifeWeeksPage"));
const LifeWeekReviewLogPage = lazy(() => import("./pages/life/LifeWeekReviewLogPage"));
const LifePrioritiesPage = lazy(() => import("./pages/life/LifePrioritiesPage"));
const HabitsPage = lazy(() => import("./pages/life/HabitsPage"));
const TodosPage = lazy(() => import("./pages/life/TodosPage"));
const MusicPage = lazy(() => import("./pages/MusicPage"));
const ReadingPlansPage = lazy(() => import("./pages/bible/ReadingPlansPage"));
const CodeLabPage = lazy(() => import("./pages/bible/CodeLabPage"));
const LivingHopeHubPage = lazy(() => import("./pages/living-hope/LivingHopeHubPage"));
const FutureLetterPage = lazy(() => import("./pages/living-hope/FutureLetterPage"));
const MorningReviewPage = lazy(() => import("./pages/living-hope/MorningReviewPage"));
const WorkbookSectionPage = lazy(() => import("./pages/living-hope/WorkbookSectionPage"));
const PrayerHubPage = lazy(() => import("./pages/prayer/PrayerHubPage"));
const PrayerRequestsListPage = lazy(() => import("./pages/prayer/PrayerRequestsListPage"));
const PrayerRequestNewPage = lazy(() => import("./pages/prayer/PrayerRequestNewPage"));
const PrayerRequestDetailPage = lazy(() => import("./pages/prayer/PrayerRequestDetailPage"));
const PrayerAnswerCelebrationPage = lazy(() => import("./pages/prayer/PrayerAnswerCelebrationPage"));
const PraiseReportsPage = lazy(() => import("./pages/prayer/PraiseReportsPage"));
const PrayerTimelinePage = lazy(() => import("./pages/prayer/PrayerTimelinePage"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PwaUpdatePrompt />
        <BrowserRouter>
          <AppOfflineBanner />
          <AuthProvider>
            <GlobalMediaPlayerProvider>
            <LifeWeekReviewProvider>
            <JournalVideoLaunchProvider>
            <ThemeSwitcher />
            <Suspense fallback={<AppRouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/reset" element={<AuthResetPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/partner/accept" element={<PartnerAcceptPage />} />
                <Route element={<ShellGate />}>
                  <Route path="/read/contents" element={<ContentsReaderPage />} />
                  <Route path="/read/study/:section" element={<StudyBackMatterPage />} />
                  <Route path="/read/:book/:chapter" element={<ReaderPage />} />
                  <Route path="/bible/life-guide" element={<LifeGuidePage />} />
                  <Route path="/bible/code-lab" element={<CodeLabPage />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/my-ai" element={<MyAiPage />} />
                  <Route path="/my-ai/:chatId" element={<MyAiPage />} />
                  <Route path="/partner" element={<PartnerWalkPage />} />
                  <Route path="/reading-plans" element={<ReadingPlansPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/sleep" element={<SleepPage />} />
                  <Route path="/living-hope" element={<LivingHopeHubPage />} />
                  <Route path="/living-hope/letter" element={<FutureLetterPage />} />
                  <Route path="/living-hope/review" element={<MorningReviewPage />} />
                  <Route path="/living-hope/workbook/:section" element={<WorkbookSectionPage />} />
                  <Route path="/life-weeks" element={<LifeWeeksPage />} />
                  <Route path="/life/week-reviews" element={<LifeWeekReviewLogPage />} />
                  <Route path="/life/priorities" element={<LifePrioritiesPage />} />
                  <Route path="/life/habits" element={<HabitsPage />} />
                  <Route path="/life/todos" element={<TodosPage />} />
                  <Route path="/todos" element={<Navigate to="/life/todos" replace />} />
                  <Route path="/music" element={<MusicPage />} />
                  <Route path="/prayer" element={<PrayerHubPage />} />
                  <Route path="/prayer/requests" element={<PrayerRequestsListPage />} />
                  <Route path="/prayer/requests/new" element={<PrayerRequestNewPage />} />
                  <Route path="/prayer/requests/:id/celebrate" element={<PrayerAnswerCelebrationPage />} />
                  <Route path="/prayer/requests/:id" element={<PrayerRequestDetailPage />} />
                  <Route path="/prayer/praise" element={<PraiseReportsPage />} />
                  <Route path="/prayer/timeline" element={<PrayerTimelinePage />} />
                  <Route path="/framework" element={<FrameworkDashboard />} />
                  <Route path="/framework/journey" element={<FaithJourneyPage />} />
                  <Route path="/framework/playbook" element={<PlaybookPage />} />
                  <Route path="/framework/playbook/:id" element={<PlaybookDetailPage />} />
                  <Route path="/framework/interview/:layer" element={<InterviewPage />} />
                  <Route path="/framework/beliefs" element={<BeliefsListPage />} />
                  <Route path="/framework/beliefs/:id" element={<BeliefDetailPage />} />
                  <Route path="/framework/graph" element={<MindGraphPage />} />
                  <Route path="/framework/graph/beliefs" element={<BeliefGraphPage />} />
                  <Route path="/framework/tensions" element={<TensionsPage />} />
                  <Route path="/framework/influences" element={<InfluencesPage />} />
                  <Route path="/framework/digest" element={<DigestPage />} />
                  <Route path="/framework/chat" element={<Navigate to="/my-ai" replace />} />
                  <Route path="/framework/chat/legacy" element={<ChatPage />} />
                  <Route path="/framework/study" element={<StudyPage />} />
                  <Route path="/framework/daily" element={<DailyPage />} />
                  <Route path="/framework/live" element={<Navigate to="/framework/artifacts/live" replace />} />
                  <Route path="/journal/notes" element={<JournalNotesPage />} />
                  <Route path="/journal/notes/e/:entryId" element={<JournalNotesPage />} />
                  <Route path="/journal" element={<JournalPage />} />
                  <Route path="/journal/j/:journalId" element={<JournalPage />} />
                  <Route path="/journal/j/:journalId/e/:entryId" element={<JournalPage />} />
                  <Route path="/journal/e/:entryId" element={<JournalPage />} />
                  <Route path="/journal/calendar" element={<JournalCalendarPage />} />
                  <Route path="/journal/j/:journalId/calendar" element={<JournalCalendarPage />} />
                  <Route path="/journal/media" element={<JournalMediaPage />} />
                  <Route path="/journal/j/:journalId/media" element={<JournalMediaPage />} />
                  <Route path="/journal/map" element={<JournalMapPage />} />
                  <Route path="/journal/j/:journalId/map" element={<JournalMapPage />} />
                  <Route path="/journal/graph" element={<JournalGraphPage />} />
                  <Route path="/journal/j/:journalId/graph" element={<JournalGraphPage />} />
                  <Route path="/journal/mirror" element={<JournalMirrorPage />} />
                  <Route path="/journal/prompts" element={<JournalPromptsPage />} />
                  <Route path="/journal/today" element={<JournalTodayPage />} />
                  <Route path="/journal/life" element={<JournalLifePage />} />
                  <Route path="/journal/life/praise" element={<Navigate to="/prayer/praise" replace />} />
                  <Route path="/journal/life/:kind" element={<JournalLifePage />} />
                  <Route path="/journal/vent" element={<JournalVentPage />} />
                  <Route path="/journal/chat" element={<JournalChatPage />} />
                  <Route path="/journal/chat/:entryId" element={<JournalChatPage />} />
                  <Route path="/journal/new" element={<NewJournalEntryPage />} />
                  <Route path="/journal/:id" element={<JournalEntryPage />} />
                  <Route path="/journal/:id/edit" element={<NewJournalEntryPage />} />
                  <Route path="/framework/artifacts" element={<ArtifactsListPage />} />
                  <Route path="/framework/library-standing" element={<LibraryStandingPage />} />
                  <Route path="/framework/artifacts/new" element={<NewArtifactPage />} />
                  <Route path="/framework/artifacts/live" element={<LiveStreamPage />} />
                  <Route
                    path="/framework/artifacts/:id"
                    element={
                      <ArtifactDetailErrorBoundary>
                        <ArtifactDetailPage />
                      </ArtifactDetailErrorBoundary>
                    }
                  />
                  <Route
                    path="/framework/artifacts/:id/research/:claimId"
                    element={
                      <ArtifactDetailErrorBoundary>
                        <ClaimResearchWorkspacePage />
                      </ArtifactDetailErrorBoundary>
                    }
                  />
                  <Route path="/framework/research-later" element={<ResearchLaterPage />} />
                  <Route path="/framework/hard-questions" element={<HardQuestionsListPage />} />
                  <Route path="/framework/hard-questions/new" element={<HardQuestionNewPage />} />
                  <Route path="/framework/hard-questions/:id" element={<HardQuestionWorkspacePage />} />
                  <Route path="/framework/questions-for-god" element={<QuestionsForGodListPage />} />
                  <Route path="/framework/questions-for-god/new" element={<QuestionForGodNewPage />} />
                  <Route path="/framework/questions-for-god/:id" element={<QuestionForGodDetailPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
            <Suspense fallback={null}>
              <HomeIndicator />
              <GlobalJournalLauncher />
              <GlobalMediaPlayerHost />
              <GlobalJournalQuickCapture />
              <GlobalArtifactVideoPip />
              <LifeWeekReviewGate />
              <JournalVideoUploadRetry />
            </Suspense>
            </JournalVideoLaunchProvider>
            </LifeWeekReviewProvider>
            </GlobalMediaPlayerProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AppErrorBoundary>
  </QueryClientProvider>
);

/** Offline banner on app routes (reader shows its own with cache hints). */
function AppOfflineBanner() {
  const { pathname } = useLocation();
  const online = useOnlineStatus();
  if (online || pathname.startsWith("/read/")) return null;
  return <OfflineBanner />;
}

/** Apply Apple-style white theme to <body> on every route except the Bible reader. */
function ThemeSwitcher() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isReader = pathname.startsWith("/read/");
    document.body.classList.toggle("app-theme", !isReader);
  }, [pathname]);
  return null;
}

export default App;

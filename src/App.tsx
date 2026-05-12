import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/auth/AuthPage";
import OnboardingPage from "./pages/onboarding/OnboardingPage";
import ReaderPage from "./pages/reader/ReaderPage";
import SettingsPage from "./pages/settings/SettingsPage";
import SleepPage from "./pages/sleep/SleepPage";
import FrameworkDashboard from "./pages/framework/FrameworkDashboard";
import FaithJourneyPage from "./pages/framework/FaithJourneyPage";
import InterviewPage from "./pages/framework/InterviewPage";
import BeliefsListPage from "./pages/framework/BeliefsListPage";
import BeliefDetailPage from "./pages/framework/BeliefDetailPage";
import ArtifactsListPage from "./pages/framework/ArtifactsListPage";
import NewArtifactPage from "./pages/framework/NewArtifactPage";
import ArtifactDetailPage from "./pages/framework/ArtifactDetailPage";
import BeliefGraphPage from "./pages/framework/BeliefGraphPage";
import PlaybookPage from "./pages/framework/PlaybookPage";
import PlaybookDetailPage from "./pages/framework/PlaybookDetailPage";
import TensionsPage from "./pages/framework/TensionsPage";
import InfluencesPage from "./pages/framework/InfluencesPage";
import DigestPage from "./pages/framework/DigestPage";
import ChatPage from "./pages/framework/ChatPage";
import StudyPage from "./pages/framework/StudyPage";
import DailyPage from "./pages/framework/DailyPage";
import JournalPage from "./pages/journal/JournalPage";
import JournalCalendarPage from "./pages/journal/JournalCalendarPage";
import JournalEntryPage from "./pages/journal/JournalEntryPage";
import NewJournalEntryPage from "./pages/journal/NewJournalEntryPage";
import JournalMirrorPage from "./pages/journal/JournalMirrorPage";
import JournalMediaPage from "./pages/journal/JournalMediaPage";
import JournalMapPage from "./pages/journal/JournalMapPage";
import JournalPromptsPage from "./pages/journal/JournalPromptsPage";
import JournalTodayPage from "./pages/journal/JournalTodayPage";
import JournalLifePage from "./pages/journal/JournalLifePage";
import JournalVentPage from "./pages/journal/JournalVentPage";
import HomeIndicator from "./components/HomeIndicator";
import GlobalJournalLauncher from "./components/journal/GlobalJournalLauncher";
import MyAiPage from "./pages/myai/MyAiPage";
import PartnerWalkPage from "./pages/partner/PartnerWalkPage";
import PartnerAcceptPage from "./pages/partner/PartnerAcceptPage";

const queryClient = new QueryClient();

/** Apply Apple-style white theme to <body> on every route except the Bible reader. */
function ThemeSwitcher() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isReader = pathname.startsWith("/read/");
    document.body.classList.toggle("app-theme", !isReader);
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ThemeSwitcher />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/my-ai" element={<MyAiPage />} />
            <Route path="/my-ai/:chatId" element={<MyAiPage />} />
            <Route path="/partner" element={<PartnerWalkPage />} />
            <Route path="/partner/accept" element={<PartnerAcceptPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/read/:book/:chapter" element={<ReaderPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/sleep" element={<SleepPage />} />
            <Route path="/framework" element={<FrameworkDashboard />} />
            <Route path="/framework/journey" element={<FaithJourneyPage />} />
            <Route path="/framework/playbook" element={<PlaybookPage />} />
            <Route path="/framework/playbook/:id" element={<PlaybookDetailPage />} />
            <Route path="/framework/interview/:layer" element={<InterviewPage />} />
            <Route path="/framework/beliefs" element={<BeliefsListPage />} />
            <Route path="/framework/beliefs/:id" element={<BeliefDetailPage />} />
            <Route path="/framework/graph" element={<BeliefGraphPage />} />
            <Route path="/framework/tensions" element={<TensionsPage />} />
            <Route path="/framework/influences" element={<InfluencesPage />} />
            <Route path="/framework/digest" element={<DigestPage />} />
            <Route path="/framework/chat" element={<ChatPage />} />
            <Route path="/framework/study" element={<StudyPage />} />
            <Route path="/framework/daily" element={<DailyPage />} />
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
            <Route path="/journal/mirror" element={<JournalMirrorPage />} />
            <Route path="/journal/prompts" element={<JournalPromptsPage />} />
            <Route path="/journal/today" element={<JournalTodayPage />} />
            <Route path="/journal/life" element={<JournalLifePage />} />
            <Route path="/journal/life/:kind" element={<JournalLifePage />} />
            <Route path="/journal/vent" element={<JournalVentPage />} />
            <Route path="/journal/new" element={<NewJournalEntryPage />} />
            <Route path="/journal/:id" element={<JournalEntryPage />} />
            <Route path="/journal/:id/edit" element={<NewJournalEntryPage />} />
            <Route path="/framework/artifacts" element={<ArtifactsListPage />} />
            <Route path="/framework/artifacts/new" element={<NewArtifactPage />} />
            <Route path="/framework/artifacts/:id" element={<ArtifactDetailPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <HomeIndicator />
          <GlobalJournalLauncher />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

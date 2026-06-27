import { useCallback } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { useSettingsPage } from "@/hooks/useSettingsPage";
import { hubShellPageRoot } from "@/lib/shell/hubShellClasses";
import { parseSettingsSection, type SettingsSectionId } from "@/lib/settings/settingsNav";
import { cn } from "@/lib/utils";
import { AiUsageSection } from "@/components/settings/AiUsageSection";
import { YouTubeConnectionSection } from "@/components/settings/YouTubeConnectionSection";
import { YouTubeSubscriptionsSection } from "@/components/settings/YouTubeSubscriptionsSection";
import { PartnerSettingsSection } from "@/components/partner/PartnerSettingsSection";
import { SeedTimelineCard } from "@/components/settings/SeedTimelineCard";
import {
  getSettingsSection,
  SettingsPageHeader,
  SettingsSectionNav,
} from "@/components/settings/SettingsSectionNav";
import {
  SettingsAppearanceSection,
  SettingsHomeSection,
  SettingsProfileSection,
  SettingsReaderSection,
} from "@/components/settings/SettingsSections";
import { SettingsAccountSection } from "@/components/settings/SettingsAccountSection";
import { StorageSettingsSection } from "@/components/settings/StorageUsageSection";
import { JournalEncryptionSection } from "@/components/settings/JournalEncryptionSection";
import { SettingsLegalFooter } from "@/components/legal/LegalPageLayout";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [params, setParams] = useSearchParams();
  const activeSection = parseSettingsSection(params.get("section"));
  const sectionMeta = getSettingsSection(activeSection);
  const settings = useSettingsPage();

  const setSection = useCallback(
    (id: SettingsSectionId) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id === "profile") next.delete("section");
        else next.set("section", id);
        return next;
      }, { replace: true });
    },
    [setParams],
  );

  if (!loading && !user) return <Navigate to="/auth" replace />;
  if (!settings.profile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={hubShellPageRoot(
        showHubShell,
        "min-h-[100dvh] bg-background flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]",
        "bg-background flex flex-col md:flex-row min-h-0 h-full overflow-hidden",
      )}
    >
      <aside className="md:w-56 lg:w-60 shrink-0 border-b md:border-b-0 md:border-r bg-card/40">
        <div className="hidden md:block border-b px-4 py-4">
          <SettingsPageHeader showBack={false} activeSection={sectionMeta} />
        </div>
        <div
          className={cn(
            "md:hidden border-b px-3 py-3",
            !showHubShell && "pt-[calc(var(--safe-area-inset-top)+0.75rem)]",
          )}
        >
          <SettingsPageHeader showBack={!showHubShell} activeSection={sectionMeta} />
        </div>
        <div className="hidden md:block">
          <SettingsSectionNav
            active={activeSection}
            onSelect={setSection}
            orientation="vertical"
            saving={settings.saving}
          />
        </div>
        <div className="md:hidden">
          <SettingsSectionNav
            active={activeSection}
            onSelect={setSection}
            orientation="horizontal"
            saving={settings.saving}
          />
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col min-w-0">
        <div className="hidden md:flex h-14 shrink-0 items-center border-b px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{sectionMeta.label}</h2>
            <p className="text-xs text-muted-foreground">{sectionMeta.description}</p>
          </div>
        </div>

        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            "px-4 py-4 md:px-6 md:py-6",
            "max-w-2xl w-full mx-auto md:max-w-3xl md:mx-0 lg:max-w-4xl",
          )}
        >
          {activeSection === "profile" ? (
            <>
              <SettingsProfileSection state={settings} onSignOut={signOut} />
              <SettingsAccountSection />
            </>
          ) : null}

          {activeSection === "reader" ? <SettingsReaderSection state={settings} /> : null}

          {activeSection === "appearance" ? <SettingsAppearanceSection state={settings} /> : null}

          {activeSection === "home" ? <SettingsHomeSection state={settings} /> : null}

          {activeSection === "partner" ? <PartnerSettingsSection embedded /> : null}

          {activeSection === "integrations" ? (
            <div className="space-y-8">
              <YouTubeConnectionSection embedded />
              <YouTubeSubscriptionsSection embedded />
            </div>
          ) : null}

          {activeSection === "storage" ? <StorageSettingsSection embedded /> : null}

          {activeSection === "ai" ? <AiUsageSection userId={user?.id} embedded /> : null}

          {activeSection === "knowledge" ? (
            user?.id ? <SeedTimelineCard userId={user.id} /> : null
          ) : null}

          {activeSection === "privacy" ? <JournalEncryptionSection /> : null}

          <SettingsLegalFooter />
        </div>
      </main>
    </div>
  );
}

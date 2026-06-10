import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  Database,
  HeartHandshake,
  LayoutGrid,
  Loader2,
  Palette,
  Plug,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SETTINGS_SECTIONS,
  type SettingsSection,
  type SettingsSectionId,
} from "@/lib/settings/settingsNav";

const ICONS: Record<SettingsSectionId, React.ComponentType<{ className?: string }>> = {
  profile: User,
  reader: BookOpen,
  appearance: Palette,
  home: LayoutGrid,
  partner: HeartHandshake,
  integrations: Plug,
  ai: BarChart3,
  knowledge: Database,
};

type NavProps = {
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  orientation: "vertical" | "horizontal";
  saving?: boolean;
};

function NavButton({
  section,
  active,
  onSelect,
  compact,
}: {
  section: SettingsSection;
  active: boolean;
  onSelect: (id: SettingsSectionId) => void;
  compact?: boolean;
}) {
  const Icon = ICONS[section.id];

  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      className={cn(
        "flex items-center gap-2 rounded-lg text-left transition-colors shrink-0",
        compact ? "px-3 py-2 text-sm" : "w-full px-3 py-2.5 text-sm",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : section.accent)} />
      <span className="truncate">{section.label}</span>
    </button>
  );
}

export function SettingsSectionNav({ active, onSelect, orientation, saving }: NavProps) {
  const vertical = orientation === "vertical";

  return (
    <nav
      className={cn(
        vertical
          ? "flex flex-col gap-0.5 p-2"
          : "flex gap-1 overflow-x-auto scrollbar-hide p-2",
      )}
      aria-label="Settings sections"
    >
      {SETTINGS_SECTIONS.map((section) => (
        <NavButton
          key={section.id}
          section={section}
          active={active === section.id}
          onSelect={onSelect}
          compact={!vertical}
        />
      ))}
      {saving ? (
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground px-3 py-2",
            vertical ? "mt-2 border-t pt-3" : "shrink-0",
          )}
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Saving…
        </div>
      ) : null}
    </nav>
  );
}

export function SettingsPageHeader({
  showBack,
  activeSection,
}: {
  showBack: boolean;
  activeSection: SettingsSection;
}) {
  const Icon = ICONS[activeSection.id];

  return (
    <div className="flex min-w-0 items-center gap-3">
      {showBack ? (
        <Button variant="ghost" size="icon" asChild className="md:hidden shrink-0">
          <Link to="/home" aria-label="Back to home">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
      ) : null}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 md:hidden">
          <h1 className="truncate text-base font-semibold">{activeSection.label}</h1>
          <p className="truncate text-xs text-muted-foreground">{activeSection.description}</p>
        </div>
        <div className="min-w-0 hidden md:block">
          <h1 className="truncate text-sm font-semibold">Settings</h1>
          <p className="truncate text-xs text-muted-foreground">Profile, reader, and integrations</p>
        </div>
      </div>
      <div className="ml-auto hidden md:flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", activeSection.accent)} />
        <span>{activeSection.label}</span>
      </div>
    </div>
  );
}

export function getSettingsSection(id: SettingsSectionId): SettingsSection {
  return SETTINGS_SECTIONS.find((s) => s.id === id) ?? SETTINGS_SECTIONS[0];
}

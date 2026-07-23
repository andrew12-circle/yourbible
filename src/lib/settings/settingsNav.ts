import {
  BarChart3,
  BookOpen,
  Database,
  HardDrive,
  HeartHandshake,
  LayoutGrid,
  Palette,
  Plug,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";

export type SettingsSectionId =
  | "profile"
  | "reader"
  | "appearance"
  | "home"
  | "partner"
  | "integrations"
  | "storage"
  | "ai"
  | "knowledge"
  | "privacy";

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Name, photo, app refresh, and life timeline",
    icon: User,
    accent: "text-blue-500",
  },
  {
    id: "reader",
    label: "Bible & reader",
    description: "Translation and live preview",
    icon: BookOpen,
    accent: "text-amber-600",
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Day/night mode, cover, highlights, fonts",
    icon: Palette,
    accent: "text-violet-500",
  },
  {
    id: "home",
    label: "Home screen",
    description: "Layout mode and wallpaper",
    icon: LayoutGrid,
    accent: "text-indigo-500",
  },
  {
    id: "partner",
    label: "Partner",
    description: "Walk together with someone you trust",
    icon: HeartHandshake,
    accent: "text-red-400",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "YouTube transcripts and subscriptions",
    icon: Plug,
    accent: "text-orange-500",
  },
  {
    id: "storage",
    label: "Storage",
    description: "Usage meter and Google Drive backup",
    icon: HardDrive,
    accent: "text-sky-500",
  },
  {
    id: "ai",
    label: "AI usage",
    description: "Estimated API spend and activity",
    icon: BarChart3,
    accent: "text-emerald-500",
  },
  {
    id: "knowledge",
    label: "Knowledge base",
    description: "Import spiritual timeline seed data",
    icon: Database,
    accent: "text-teal-500",
  },
  {
    id: "privacy",
    label: "Journal privacy",
    description: "End-to-end encryption and recovery",
    icon: ShieldCheck,
    accent: "text-emerald-600",
  },
];

export function parseSettingsSection(raw: string | null): SettingsSectionId {
  const found = SETTINGS_SECTIONS.find((s) => s.id === raw);
  return found?.id ?? "profile";
}

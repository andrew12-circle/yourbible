import {
  BookOpen,
  CloudMoon,
  HandHeart,
  Heart,
  MessageCircle,
  Music,
  Sparkles,
  Star,
  CheckCircle2,
  FileText,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PrayerTimelineEventKind } from "@/lib/prayer/types";
import { TIMELINE_EVENT_LABELS } from "@/lib/prayer/timeline";

export const TIMELINE_EVENT_ICONS: Record<PrayerTimelineEventKind, LucideIcon> = {
  asked: HandHeart,
  note: FileText,
  scripture: BookOpen,
  journal: MessageCircle,
  artifact: Youtube,
  dream: CloudMoon,
  worship: Music,
  gratitude: Heart,
  opportunity: Sparkles,
  answered: CheckCircle2,
  praise: Star,
};

export function timelineEventIcon(kind: PrayerTimelineEventKind): LucideIcon {
  return TIMELINE_EVENT_ICONS[kind] ?? FileText;
}

export function timelineEventLabel(kind: PrayerTimelineEventKind): string {
  return TIMELINE_EVENT_LABELS[kind] ?? kind;
}

import { Link } from "react-router-dom";
import { Pin, Sparkles, MapPin, MessageCircle } from "lucide-react";
import { moodMeta } from "./MoodPicker";
import { formatTemp } from "@/lib/journal/context";
import { coerceJournalEntryKind, ENTRY_KIND_META } from "@/lib/journal/entryKinds";

export interface EntryListData {
  id: string;
  title: string | null;
  body: string;
  entry_at_ts: string;
  mood: number | null;
  location_name: string | null;
  weather: string | null;
  weather_temp_c: number | null;
  weather_icon: string | null;
  pinned: boolean;
  analyze_for_mirror: boolean;
  photo_url?: string;
  entry_kind?: string | null;
}

export default function EntryListItem({ entry }: { entry: EntryListData }) {
  const dt = new Date(entry.entry_at_ts);
  const dow = dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const day = dt.getDate();
  const time = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const mood = entry.mood !== null ? moodMeta(entry.mood) : null;
  const tempStr =
    entry.weather_temp_c != null ? formatTemp(entry.weather_temp_c) : null;
  const faithKind = coerceJournalEntryKind(entry.entry_kind);
  const isChat = entry.entry_kind === "chat";
  const href = isChat ? `/journal/chat/${entry.id}` : `/journal/${entry.id}`;

  return (
    <Link
      to={href}
      className="group flex gap-4 px-5 py-4 active:bg-muted/40 hover:bg-muted/20 transition-colors"
    >
      {/* Day One-style date stamp */}
      <div className="flex-shrink-0 w-11 text-center pt-0.5">
        <div className="text-[10px] font-semibold tracking-[0.12em] text-red-500">
          {dow}
        </div>
        <div className="text-[26px] font-semibold leading-none tracking-tight mt-0.5 tabular-nums">
          {day}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-0.5">
          {entry.pinned && (
            <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 mt-1 flex-shrink-0" />
          )}
          <h3 className="text-[16px] font-semibold tracking-tight truncate flex-1 leading-snug">
            {entry.title || firstLine(entry.body) || (
              <span className="italic font-normal text-muted-foreground">No title</span>
            )}
          </h3>
          {entry.analyze_for_mirror && (
            <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-1 flex-shrink-0" />
          )}
          {isChat && (
            <MessageCircle className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 mt-1 flex-shrink-0" aria-hidden />
          )}
          {faithKind && (
            <span className="mt-0.5 shrink-0 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {ENTRY_KIND_META[faithKind].label}
            </span>
          )}
        </div>
        <p className="text-[14px] text-muted-foreground line-clamp-2 leading-snug">
          {entry.title ? entry.body : afterFirstLine(entry.body)}
        </p>
        <div className="text-[12px] text-muted-foreground/80 mt-2 flex items-center gap-2 flex-wrap">
          <span className="tabular-nums">{time}</span>
          {entry.location_name && (
            <span className="inline-flex items-center gap-0.5 truncate max-w-[40%]">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{entry.location_name}</span>
            </span>
          )}
          {tempStr && (
            <span className="inline-flex items-center gap-1">
              {entry.weather_icon && <span>{entry.weather_icon}</span>}
              <span className="tabular-nums">{tempStr}</span>
            </span>
          )}
          {mood && <span className={mood.color}>{mood.label}</span>}
        </div>
      </div>

      {entry.photo_url && (
        <img
          src={entry.photo_url}
          alt=""
          className="flex-shrink-0 w-[68px] h-[68px] rounded-xl object-cover bg-muted"
        />
      )}
    </Link>
  );
}

function firstLine(s: string) {
  return (s || "").split("\n")[0]?.slice(0, 80) ?? "";
}
function afterFirstLine(s: string) {
  const parts = (s || "").split("\n");
  return parts.slice(1).join(" ").trim() || parts[0] || "";
}
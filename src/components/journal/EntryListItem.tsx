import { Link } from "react-router-dom";
import { Pin, Sparkles } from "lucide-react";
import { moodMeta } from "./MoodPicker";
import { formatTemp } from "@/lib/journal/context";

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
}

export default function EntryListItem({ entry }: { entry: EntryListData }) {
  const dt = new Date(entry.entry_at_ts);
  const dow = dt.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const day = dt.getDate();
  const time = dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const meta = [time];
  if (entry.location_name) meta.push(entry.location_name);
  if (entry.weather_temp_c != null) {
    meta.push(`${formatTemp(entry.weather_temp_c)}${entry.weather ? " " + entry.weather : ""}`);
  } else if (entry.weather) {
    meta.push(entry.weather);
  }

  return (
    <Link
      to={`/journal/${entry.id}`}
      className="group flex gap-4 px-5 py-3.5 active:bg-muted/50 hover:bg-muted/30 transition-colors"
    >
      {/* Date stamp column */}
      <div className="flex-shrink-0 w-12 pt-0.5">
        {entry.photo_url ? (
          <img
            src={entry.photo_url}
            alt=""
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="text-center">
            <div className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
              {dow}
            </div>
            <div className="text-[24px] font-bold leading-tight tracking-tight">
              {day}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {(entry.title || entry.pinned || entry.analyze_for_mirror) && (
          <div className="flex items-center gap-1.5 mb-0.5">
            {entry.pinned && (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
            )}
            {entry.title && (
              <h3 className="text-[15px] font-semibold tracking-tight truncate">
                {entry.title}
              </h3>
            )}
            {entry.analyze_for_mirror && (
              <Sparkles className="w-3 h-3 text-violet-500 ml-auto flex-shrink-0" />
            )}
          </div>
        )}
        <p className="text-[14px] text-foreground/75 line-clamp-2 leading-snug">
          {entry.body || (
            <span className="italic text-muted-foreground">No body</span>
          )}
        </p>
        <div className="text-[12px] text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
          <span>{meta.join(" · ")}</span>
          {entry.mood !== null && moodMeta(entry.mood) && (
            <span className={moodMeta(entry.mood)!.color}>
              · {moodMeta(entry.mood)!.label}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
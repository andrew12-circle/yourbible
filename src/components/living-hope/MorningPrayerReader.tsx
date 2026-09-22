import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { lh } from "@/lib/livingHope/themeClasses";
import { PrayerVoiceRecording } from "./PrayerVoiceRecording";

export function MorningPrayerReader({
  title,
  value,
  onChange,
  prayerKey,
  recordingPath,
  onRecordingPathChange,
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  prayerKey?: "surrender" | "covering";
  recordingPath?: string;
  onRecordingPathChange?: (path: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  return <section className="space-y-5" aria-label={`${title} prayer`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Read aloud at your own pace.</p><Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditing((v) => !v)}>{editing ? "Read prayer" : "Edit prayer"}</Button></div>
    {editing ? <MorningVoiceField label={`${title} prayer text`} value={value} onChange={onChange} multiline rows={16} /> : <article className="whitespace-pre-wrap font-serif text-[20px] leading-[1.85] text-foreground">{value}</article>}
    {prayerKey && onRecordingPathChange ? <PrayerVoiceRecording prayerKey={prayerKey} storagePath={recordingPath} onStoragePathChange={onRecordingPathChange} /> : null}
    <p className="text-xs text-muted-foreground">Personal prayer, not Scripture.</p>
  </section>;
}

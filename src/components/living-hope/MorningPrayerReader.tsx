import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ChatPrayerBiblePage from "@/components/journal/ChatPrayerBiblePage";

export function MorningPrayerReader({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  return <section className="space-y-3" aria-label={`${title} prayer`}>
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Read aloud at your own pace.</p><Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>{editing ? "Read prayer" : "Edit prayer"}</Button></div>
    {editing ? <Textarea aria-label={`${title} prayer text`} value={value} onChange={(e) => onChange(e.target.value)} rows={16} /> : <ChatPrayerBiblePage text={value} title={title} label="Personal prayer" footer="Morning Formula · Personal prayer, not Scripture" />}
  </section>;
}

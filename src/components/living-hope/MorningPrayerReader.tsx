import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { lh } from "@/lib/livingHope/themeClasses";

export function MorningPrayerReader({ title, value, onChange }: { title: string; value: string; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  return <section className="space-y-5" aria-label={`${title} prayer`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Read aloud at your own pace.</p><Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditing((v) => !v)}>{editing ? "Read prayer" : "Edit prayer"}</Button></div>
    {editing ? <Textarea aria-label={`${title} prayer text`} className={lh.textarea} value={value} onChange={(e) => onChange(e.target.value)} rows={16} /> : <article className="whitespace-pre-wrap font-serif text-[20px] leading-[1.85] text-foreground">{value}</article>}
    <p className="text-xs text-muted-foreground">Personal prayer, not Scripture.</p>
  </section>;
}

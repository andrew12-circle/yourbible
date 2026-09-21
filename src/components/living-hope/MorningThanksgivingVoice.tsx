import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { localDateISO } from "@/lib/lifePriorities";
import { placeSpokenThanksgiving } from "@/lib/livingHope/spokenThanksgiving";

export function MorningThanksgivingVoice({ group, values, onChange }: { group: "now" | "not-yet"; values: string[]; onChange: (index: number, value: string) => void }) {
  const { user, profile } = useAuth();
  const key = `yb-morning-thanks:${user?.id ?? "signed-out"}:${localDateISO()}:${group}`;
  const allowed = Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled;
  const [draft, setDraft] = useState<{ key: string; text: string }>({ key: "", text: "" });
  const transcript = draft.key === key ? draft.text : "";
  const draftRef = useRef({ key: "", text: "" });
  const setTranscript = (value: string | ((previous: string) => string)) => {
    const previous = draftRef.current.key === key ? draftRef.current.text : "";
    const text = typeof value === "function" ? value(previous) : value;
    draftRef.current = { key, text };
    // Persist outside React's state updater so a final speech result survives navigation.
    try { if (allowed) { if (text) sessionStorage.setItem(key, text); else sessionStorage.removeItem(key); } } catch { /* Keep the visible draft. */ }
    setDraft({ key, text });
  };
  const [interim, setInterim] = useState("");
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  const mic = useRef<DictateButtonHandle>(null);
  useEffect(() => {
    let text = "";
    try { if (allowed) text = sessionStorage.getItem(key) ?? ""; else sessionStorage.removeItem(key); } catch { /* Optional device cache. */ }
    draftRef.current = { key, text };
    setDraft({ key, text });
    setInterim(""); setMessage("");
    const control = mic.current;
    return () => control?.stop();
  }, [key, allowed]);
  const preview = placeSpokenThanksgiving(values, transcript);
  return <JournalAiPrivacy.Provider value={allowed}>
    <div className="rounded-xl bg-muted/30 p-3 mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <DictateButton ref={mic} userId={user?.id} webSpeechOnly onAppend={(chunk) => setTranscript((v) => `${v}${v && !/\s$/.test(v) ? " " : ""}${chunk}`)} onInterim={(partial) => {
          setInterim(partial);
          if (!allowed) return;
          const finalText = draftRef.current.key === key ? draftRef.current.text : "";
          const recovery = `${finalText}${finalText && partial ? " " : ""}${partial}`;
          try { if (recovery) sessionStorage.setItem(key, recovery); else sessionStorage.removeItem(key); } catch { /* Keep the live transcript. */ }
        }} onListeningChange={setActive} />
        <Button type="button" variant="outline" className="min-w-0 flex-1 h-auto min-h-9 whitespace-normal py-2" disabled={!allowed} onClick={() => mic.current?.toggle()}>{active ? "Stop speaking" : group === "now" ? "Speak my thanks for today" : "Speak my thanks for what's ahead"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Say your five thanks aloud. Say “next item” between them, then stop and place them into the list. Your existing answers will not be overwritten.</p>
      {!allowed && <p className="text-xs text-muted-foreground">Browser dictation is disabled when private-journal encryption is enabled. You can still type below.</p>}
      {(active || transcript) && <>
        <Textarea aria-label={`Spoken thanksgiving ${group}`} value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} placeholder="Your spoken words appear here…" />
        {interim && <p className="text-sm text-muted-foreground" aria-live="polite">{interim}</p>}
        <Button type="button" size="sm" disabled={active || !preview.placed} onClick={() => {
          const next = placeSpokenThanksgiving(values, transcript);
          next.values.forEach((value, index) => { if (value !== (values[index] ?? "")) onChange(index, value); });
          setTranscript(next.remaining);
          setMessage(`${next.placed} thanks added.${next.remaining ? " Extra words are kept above; nothing was discarded." : " You can edit each line below."}`);
        }}>Place into this list</Button>
        {!active && transcript && !preview.placed && <p className="text-xs">All five lines are filled. Your words are kept here; edit or clear a line before adding more.</p>}
      </>}
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
    </div>
  </JournalAiPrivacy.Provider>;
}

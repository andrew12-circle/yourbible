import { DictateButton } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Image, Link2, Pencil, Play, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import type { WorkbookStory } from "@/lib/livingHope/workbookTypes";
import { newId } from "@/lib/livingHope/workbookTypes";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

const ACE_SCENE_URL =
  "https://chatgpt.com/g/g-p-6868a9d4590481918f3bfd31e01c3abe-god/c/6ab3ed65-d60c-83ea-a731-279c06afe97c";

const ACE_STORAGE_KEY = "yb_ace_scene_card_v1";

type AceSceneSettings = { imageUrl: string; chatgptUrl: string };

type Props = {
  stories: WorkbookStory[];
  suggestedIndex: number;
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number) => void;
  onAddStory: (text: string) => void;
  onUpdateStory?: (index: number, patch: Partial<WorkbookStory>) => void;
  storyRecall: string;
  onStoryRecallChange: (value: string) => void;
};

export function MorningStoryPanel({
  stories,
  suggestedIndex,
  selectedIndex,
  onSelectedIndexChange,
  onAddStory,
  onUpdateStory,
}: Props) {
  const { user, profile } = useAuth();
  const [adding, setAdding] = useState(false);
  const [newStoryText, setNewStoryText] = useState("");
  const [openStoryIndex, setOpenStoryIndex] = useState<number | null>(null);
  const [editingStoryIndex, setEditingStoryIndex] = useState<number | null>(null);
  const [storyDraft, setStoryDraft] = useState({ title: "", imageUrl: "", chatgptUrl: "" });
  const [editingAce, setEditingAce] = useState(false);
  const [ace, setAce] = useState<AceSceneSettings>({ imageUrl: "", chatgptUrl: ACE_SCENE_URL });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ACE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AceSceneSettings>;
      setAce({
        imageUrl: typeof parsed.imageUrl === "string" ? parsed.imageUrl : "",
        chatgptUrl: typeof parsed.chatgptUrl === "string" && parsed.chatgptUrl.trim() ? parsed.chatgptUrl : ACE_SCENE_URL,
      });
    } catch {
      // Keep defaults if local settings are malformed.
    }
  }, []);

  const saveAce = useCallback((next: AceSceneSettings) => {
    setAce(next);
    window.localStorage.setItem(ACE_STORAGE_KEY, JSON.stringify(next));
    setEditingAce(false);
  }, []);

  const handleAddStory = useCallback(() => {
    const text = newStoryText.trim();
    if (!text) return;
    onAddStory(text);
    setNewStoryText("");
    setAdding(false);
  }, [newStoryText, onAddStory]);

  const startStoryEdit = useCallback((index: number) => {
    const story = stories[index];
    if (!story) return;
    setEditingStoryIndex(index);
    setStoryDraft({
      title: story.title ?? "",
      imageUrl: story.cover_image_url ?? "",
      chatgptUrl: story.chatgpt_url ?? "",
    });
  }, [stories]);

  const saveStoryEdit = useCallback(() => {
    if (editingStoryIndex == null || !onUpdateStory) return;
    onUpdateStory(editingStoryIndex, {
      title: storyDraft.title.trim() || undefined,
      cover_image_url: storyDraft.imageUrl.trim() || undefined,
      chatgpt_url: storyDraft.chatgptUrl.trim() || undefined,
    });
    setEditingStoryIndex(null);
  }, [editingStoryIndex, onUpdateStory, storyDraft]);

  return (
    <div className="flex flex-col gap-4">
      <section>
        <div className="mb-3">
          <h2 className={cn(lh.labelUpper, "mb-1")}>Play a scene</h2>
          <p className={lh.footnote}>Pick a scene. Read it here or open the narration and close your eyes.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className={cn(lh.cardFlat, "overflow-hidden")}>
            <div
              className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-700 to-amber-100 bg-cover bg-center"
              style={ace.imageUrl ? { backgroundImage: `url("${ace.imageUrl}")` } : undefined}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
              <button
                type="button"
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur hover:bg-black/60"
                onClick={() => setEditingAce((v) => !v)}
                aria-label="Edit ACE scene"
              >
                {editingAce ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </button>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Business · provision · margin</p>
                <h3 className="text-lg font-semibold leading-tight">ACE Is Working</h3>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {editingAce ? (
                <div className="space-y-2">
                  <label className={lh.footnote}>Cover image URL</label>
                  <div className="flex items-center gap-2"><Image className="h-4 w-4 shrink-0" /><Input value={ace.imageUrl} onChange={(e) => setAce((v) => ({ ...v, imageUrl: e.target.value }))} placeholder="Paste image URL" /></div>
                  <label className={lh.footnote}>ChatGPT scene link</label>
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4 shrink-0" /><Input value={ace.chatgptUrl} onChange={(e) => setAce((v) => ({ ...v, chatgptUrl: e.target.value }))} placeholder="Paste ChatGPT link" /></div>
                  <Button type="button" className={cn(lh.btnPrimary, "w-full")} onClick={() => saveAce(ace)}>Save scene</Button>
                </div>
              ) : (
                <>
                  <p className={cn(lh.bodySm, "leading-relaxed")}>
                    Eight appointments. Six conversations. Three applications. Two deals. Work is ordered, useful, and light.
                  </p>
                  <Button asChild className={cn(lh.btnPrimary, "w-full gap-2")}>
                    <a href={ace.chatgptUrl || ACE_SCENE_URL} target="_blank" rel="noopener noreferrer">
                      <Play className="h-4 w-4" /> Listen <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                    </a>
                  </Button>
                </>
              )}
            </div>
          </article>

          {stories.map((story, index) => {
            const suggested = index === suggestedIndex % Math.max(1, stories.length);
            const open = openStoryIndex === index;
            const editing = editingStoryIndex === index;
            const title = story.title?.trim() || `Scene ${index + 1}`;
            return (
              <article key={story.id} className={cn(lh.cardFlat, "overflow-hidden")}>
                <button type="button" onClick={() => { onSelectedIndexChange(index); setOpenStoryIndex(open ? null : index); }} className="block w-full text-left">
                  <div
                    className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-muted via-background to-primary/10 bg-cover bg-center"
                    style={story.cover_image_url ? { backgroundImage: `url("${story.cover_image_url}")` } : undefined}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                    {suggested ? <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm">Suggested today</span> : null}
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <h3 className="text-base font-semibold leading-tight">{title}</h3>
                      <p className="mt-1 text-xs text-white/75">{open ? "Tap to close" : "Tap to read"}</p>
                    </div>
                  </div>
                </button>

                <div className="space-y-3 p-4">
                  {open ? <p className={cn(lh.bodySm, "whitespace-pre-wrap leading-relaxed")}>{story.text}</p> : <p className={cn(lh.bodySm, "line-clamp-2 leading-relaxed")}>{story.text}</p>}

                  {editing ? (
                    <div className="space-y-2 rounded-lg border p-3">
                      <Input value={storyDraft.title} onChange={(e) => setStoryDraft((v) => ({ ...v, title: e.target.value }))} placeholder="Scene title" />
                      <div className="flex items-center gap-2"><Image className="h-4 w-4 shrink-0" /><Input value={storyDraft.imageUrl} onChange={(e) => setStoryDraft((v) => ({ ...v, imageUrl: e.target.value }))} placeholder="Cover image URL" /></div>
                      <div className="flex items-center gap-2"><Link2 className="h-4 w-4 shrink-0" /><Input value={storyDraft.chatgptUrl} onChange={(e) => setStoryDraft((v) => ({ ...v, chatgptUrl: e.target.value }))} placeholder="ChatGPT scene link" /></div>
                      <div className="flex gap-2">
                        <Button type="button" className={cn(lh.btnPrimary, "flex-1")} onClick={saveStoryEdit}>Save</Button>
                        <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingStoryIndex(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {story.chatgpt_url ? (
                        <Button asChild className={cn(lh.btnPrimary, "flex-1 gap-2")}>
                          <a href={story.chatgpt_url} target="_blank" rel="noopener noreferrer"><Play className="h-4 w-4" />Listen</a>
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" className={cn(lh.btnSecondary, "flex-1")} onClick={() => setOpenStoryIndex(open ? null : index)}>{open ? "Close" : "Read"}</Button>
                      )}
                      {onUpdateStory ? <Button type="button" variant="outline" className="px-3" onClick={() => startStoryEdit(index)} aria-label="Edit scene"><Pencil className="h-4 w-4" /></Button> : null}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {adding ? (
        <section className={cn(lh.cardFlat, "p-4 space-y-3")}>
          <h2 className={cn(lh.heading, "text-[15px]")}>New scene</h2>
          <JournalAiPrivacy.Provider value={Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled}>
            <div className="flex items-center gap-2"><DictateButton userId={user?.id} webSpeechOnly onAppend={(chunk) => setNewStoryText((text) => `${text} ${chunk}`.trim())} /><span className="text-sm">Speak a new scene</span></div>
          </JournalAiPrivacy.Provider>
          <MorningVoiceField value={newStoryText} onChange={setNewStoryText} multiline rows={3} label="New story scene" placeholder="Describe the scene in present tense…" />
          <div className="flex gap-2">
            <Button type="button" className={cn(lh.btnSecondary, "h-9")} onClick={handleAddStory}>Add to library</Button>
            <Button type="button" variant="ghost" className={cn(lh.btnGhost, "h-9")} onClick={() => { setAdding(false); setNewStoryText(""); }}>Cancel</Button>
          </div>
        </section>
      ) : (
        <Button type="button" variant="outline" className={cn(lh.btnGhost, "h-10 w-full justify-center gap-1.5 border-dashed")} onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add a scene
        </Button>
      )}
    </div>
  );
}

/** Append a story to workbook content; returns new index. */
export function appendWorkbookStory(stories: WorkbookStory[], text: string): { stories: WorkbookStory[]; newIndex: number } {
  const next = [...stories, { id: newId(), text: text.trim() }];
  return { stories: next, newIndex: next.length - 1 };
}

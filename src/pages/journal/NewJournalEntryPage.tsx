import { DictateButton } from "@/components/journal/DictateButton";
import { NewJournalEntryToolbar } from "@/components/journal/new-entry/NewJournalEntryToolbar";
import { NewJournalEntryBodyEditor } from "@/components/journal/new-entry/NewJournalEntryBodyEditor";
import SketchPad from "@/components/journal/SketchPad";
import { Navigate } from "react-router-dom";
import {
  Loader2,
  MapPin,
  BookOpen,
  Sparkles,
  PenLine,
  ChevronLeft,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrivacyBlurInput } from "@/components/writing/PrivacyBlurInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MoodPicker } from "@/components/journal/MoodPicker";
import { TagInput } from "@/components/journal/TagInput";
import InlineJournalChatComposer from "@/components/journal/InlineJournalChatComposer";
import { coerceJournalEntryKind, ENTRY_KIND_META } from "@/lib/journal/entryKinds";
import { useNewJournalEntryPage } from "@/hooks/useNewJournalEntryPage";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { hubShellBottomDock, hubShellPageHeight } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";
import JournalPrivacyBlurToggle from "@/components/journal/JournalPrivacyBlurToggle";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";
import { useEffect } from "react";

export default function NewJournalEntryPage() {
  const p = useNewJournalEntryPage();
  const { showHubShell } = useAppShellMode();
  const togglePrivacyBlur = useJournalPrivacyBlurStore((s) => s.toggleJournalPrivacyBlur);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        togglePrivacyBlur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrivacyBlur]);

  if (p.loading) return null;
  if (!p.user) return <Navigate to="/auth" replace />;

  const dictateButton = (
    <DictateButton
      ref={p.dictateRef}
      userId={p.user.id}
      size="md"
      className="h-9 w-9 shrink-0 rounded-full"
      onAppend={p.appendDictatedText}
      onInterim={p.setDictInterim}
    />
  );

  return (
    <div className={cn("flex flex-col overflow-hidden bg-background", hubShellPageHeight(showHubShell))}>
      <header
        className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/60 pt-[calc(var(--safe-area-inset-top)+0.5rem)]"
        style={p.vvOffsetTop > 0 ? { top: p.vvOffsetTop } : undefined}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-5 h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => p.navigate(p.layoutBack)}
            className="-ml-1 px-1 h-9 flex items-center text-primary"
            aria-label="Back"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => p.setDateOpen(true)}
            className="flex-1 min-w-0 text-left text-[15px] font-semibold tracking-tight truncate"
          >
            {p.dateLabel}
          </button>
          <JournalPrivacyBlurToggle />
          <button
            type="button"
            onClick={p.triggerHandwritten}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-foreground/80 hover:bg-muted"
            aria-label="Handwritten"
          >
            <PenLine className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => p.setMoreOpen(true)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full text-foreground/80 hover:bg-muted"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <Button
            onClick={() => void p.save()}
            disabled={p.busy}
            size="sm"
            variant="ghost"
            className="text-primary text-[15px] font-semibold px-2"
          >
            {p.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Done"}
          </Button>
        </div>
        <div className="max-w-3xl mx-auto px-3 sm:px-5 pb-2 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="uppercase tracking-wider font-semibold text-primary truncate max-w-[40%]">
            {p.journalName}
          </span>
          {(p.locationName || p.weatherLabel) && <span aria-hidden>·</span>}
          {p.locationName && (
            <button
              type="button"
              onClick={() => p.setMoreOpen(true)}
              className="truncate max-w-[40%] hover:text-foreground"
            >
              {p.locationName}
            </button>
          )}
          {p.weatherLabel && (
            <span className="inline-flex items-center gap-1 text-muted-foreground/80">
              {p.locationName && <span aria-hidden>·</span>}
              <span>{p.weatherLabel}</span>
            </span>
          )}
        </div>
      </header>

      <main
        ref={p.mainScrollRef}
        className={cn(
          "flex-1 min-h-0 max-w-3xl w-full mx-auto px-3 sm:px-5 pt-3 overflow-y-auto overscroll-contain",
          p.bodyFocused && !p.inlineChatMode && "flex flex-col",
        )}
        style={{
          paddingBottom: p.bodyFocused && !p.inlineChatMode
            ? `calc(${p.kbInset}px + env(safe-area-inset-bottom) + 1rem)`
            : "calc(env(safe-area-inset-bottom) + var(--journal-entry-dock-h, 9.5rem) + 0.75rem)",
        }}
        onPointerDown={(e) => {
          if (p.inlineChatMode) return;
          const target = e.target as HTMLElement;
          if (target.closest("textarea, input, button, a, label, [role='button']")) return;
          p.focusBodyEditor();
        }}
      >
        <PrivacyBlurInput
          value={p.title}
          onChange={(e) => p.setTitle(e.target.value)}
          placeholder="Title"
          className="border-0 bg-transparent px-0 text-[22px] leading-tight font-display font-semibold tracking-tight shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
        />

        <NewJournalEntryBodyEditor
          editId={p.editId}
          isListening={p.isListening}
          inlineChatMode={p.inlineChatMode}
          bodyFocused={p.bodyFocused}
          body={p.body}
          setBody={p.setBody}
          bodyPlaceholder={p.bodyPlaceholder}
          listeningSections={p.listeningSections}
          setListeningSection={p.setListeningSection}
          chatScrollRef={p.chatScrollRef}
          chatBottomRef={p.chatBottomRef}
          chatTurns={p.chatTurns}
          aiBusy={p.aiBusy}
          streamingAssistantId={p.streamingAssistantId}
          dictInterim={p.dictInterim}
          existingSketches={p.existingSketches}
          existingAttachments={p.existingAttachments}
          pendingSketches={p.pendingSketches}
          pendingAttachments={p.pendingAttachments}
          bodyTextareaRef={p.bodyTextareaRef}
          onBodyFocus={() => {
            p.composerLockScrollYRef.current = window.scrollY;
            p.setBodyFocused(true);
          }}
          onBodyBlur={() => p.setBodyFocused(false)}
          onOpenSketch={p.triggerHandwritten}
          onRemoveExistingPhoto={(id, path) => void p.removeExistingPhoto(id, path)}
          onRemovePendingFile={p.removePendingFile}
        />
      </main>

      <input
        ref={p.photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          p.handlePhotoInputChange(e.target.files);
          e.target.value = "";
        }}
      />
      {!p.inlineChatMode ? (
        <div className="sr-only" aria-hidden>
          {dictateButton}
        </div>
      ) : null}

      <nav
        ref={p.bottomDockRef}
        aria-label="Journal tools"
        className={hubShellBottomDock(
          showHubShell,
          cn(
            "z-30 flex justify-center px-3 sm:px-5 pt-2",
            p.bodyFocused && !p.inlineChatMode && "hidden",
          ),
        )}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
          transform: p.kbInset ? `translateY(-${p.kbInset}px)` : undefined,
          transition: "transform 120ms ease-out",
        }}
      >
        <div className="pointer-events-auto w-full max-w-3xl">
          {p.inlineChatMode ? (
            <InlineJournalChatComposer
              value={p.body}
              onChange={p.setBody}
              onSend={() => void p.sendToAi()}
              onExit={p.exitChatMode}
              dictateControl={dictateButton}
              onPointerDown={() => {
                p.composerLockScrollYRef.current = window.scrollY;
              }}
              onFocus={() => p.setComposerFocused(true)}
              onBlur={() => p.setComposerFocused(false)}
              aiBusy={p.aiBusy}
              onAttachPhotos={p.triggerPhotos}
              onHandwritten={p.triggerHandwritten}
              includeGeneral={p.includeGeneral}
              onIncludeGeneralChange={p.setIncludeGeneral}
              responseDepth={p.responseDepth}
              onResponseDepthChange={p.setResponseDepth}
              onOpenInMyAi={p.chatId ? () => p.navigate(`/my-ai/${p.chatId}`) : undefined}
            />
          ) : (
            <NewJournalEntryToolbar
              onPhotos={p.triggerPhotos}
              onWrite={p.triggerHandwritten}
              onPrompts={p.triggerPrompts}
              onAudio={p.triggerAudio}
              onChat={() => void p.openChatMode()}
              onMore={() => p.setMoreOpen(true)}
              chatDisabled={!p.canReplyWithAi}
            />
          )}
        </div>
      </nav>

      <Sheet open={p.dateOpen} onOpenChange={p.setDateOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>When</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Input type="datetime-local" value={p.entryAt} onChange={(e) => p.setEntryAt(e.target.value)} />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={p.moreOpen} onOpenChange={p.setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Entry details</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-5 pb-6">
            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry type</Label>
              <select
                value={p.entryKind ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  p.setEntryKind(v ? coerceJournalEntryKind(v) : null);
                }}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">General journal</option>
                <option value="dream">{ENTRY_KIND_META.dream.label}</option>
                <option value="praise_report">{ENTRY_KIND_META.praise_report.label}</option>
                <option value="testimony">{ENTRY_KIND_META.testimony.label}</option>
                <option value="listening">{ENTRY_KIND_META.listening.label}</option>
                <option value="vent">{ENTRY_KIND_META.vent.label} (private)</option>
              </select>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mood</Label>
              <div className="mt-2">
                <MoodPicker value={p.mood} onChange={p.setMood} />
              </div>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
              <div className="mt-2">
                <TagInput tags={p.tags} onChange={p.setTags} />
              </div>
            </section>

            <section>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Where</Label>
              <div className="mt-2 flex gap-2">
                <Input
                  value={p.locationName}
                  onChange={(e) => p.setLocationName(e.target.value)}
                  placeholder="Location (optional)"
                />
                <Button type="button" size="icon" variant="outline" onClick={p.useMyLocation} title="Use my location">
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Linked verse
                </Label>
                <Input
                  value={p.verseRef}
                  onChange={(e) => p.setVerseRef(e.target.value)}
                  placeholder="e.g. John 14:27"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Linked belief</Label>
                <select
                  value={p.beliefId}
                  onChange={(e) => p.setBeliefId(e.target.value)}
                  className="mt-2 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— none —</option>
                  {p.beliefs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.topic}: {b.statement.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="analyze" className="font-medium">
                      Include in worldview mirror
                    </Label>
                    <Switch
                      id="analyze"
                      checked={!p.isVent && p.analyzeForMirror}
                      onCheckedChange={p.setAnalyzeForMirror}
                      disabled={p.isVent}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.isVent
                      ? "Vents are private — never analyzed by the mirror."
                      : "Lovable AI scores this entry for your weekly mirror report."}
                  </p>
                </div>
              </div>
            </section>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                p.setMoreOpen(false);
                p.setSketchOpen(true);
              }}
            >
              <PenLine className="w-4 h-4 mr-2" /> Add handwritten
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <SketchPad
        open={p.sketchOpen}
        onClose={() => p.setSketchOpen(false)}
        draftKey={p.sketchDraftKey}
        onAutosave={p.editId && p.user ? p.handleSketchAutosave : undefined}
        onSave={p.handleSketchSave}
        onUnsavedExit={p.handleSketchUnsavedExit}
        filename={p.editId ? `sketch-${p.editId}` : undefined}
      />
    </div>
  );
}

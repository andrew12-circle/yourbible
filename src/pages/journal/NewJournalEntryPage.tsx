import { DictateButton } from "@/components/journal/DictateButton";
import { NewJournalEntryToolbar } from "@/components/journal/new-entry/NewJournalEntryToolbar";
import MobileJournalMoreTools from "@/components/journal/new-entry/MobileJournalMoreTools";
import JournalVideoCaptureDialog from "@/components/journal/JournalVideoCaptureDialog";
import { NewJournalEntryBodyEditor } from "@/components/journal/new-entry/NewJournalEntryBodyEditor";
import { NewJournalEntryLocationMap } from "@/components/journal/new-entry/NewJournalEntryLocationMap";
import SketchPad from "@/components/journal/SketchPad";
import { Navigate } from "react-router-dom";
import {
  Loader2,
  MapPin,
  BookOpen,
  Sparkles,
  ChevronLeft,
  AudioLines,
  Square,
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
import { journalEntryTitleInputClass } from "@/lib/journal/journalChatUi";
import { toast } from "@/hooks/use-toast";
import { useNewJournalEntryPage } from "@/hooks/useNewJournalEntryPage";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { journalEntryPageRoot, hubShellBottomDock, journalEntryHeaderPad } from "@/lib/shell/hubShellClasses";
import { mobileVisualViewportPageStyle } from "@/lib/shell/mobileShellClasses";
import { cn } from "@/lib/utils";
import { PrivateJournalCryptoBanner } from "@/components/journal/PrivateJournalCryptoBanner";
import JournalPrivacyBlurToggle from "@/components/journal/JournalPrivacyBlurToggle";
import { AiWritingAssistToolbarButton } from "@/components/writing/AiWritingAssistToggle";
import { JOURNAL_COMPOSE_HINT } from "@/lib/journal/journalPurpose";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  journalComposeMainPaddingBottom,
  journalComposeUsesVisualViewportLayout,
} from "@/lib/journal/journalComposeKeyboardLayout";

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
      onListeningChange={p.onDictationListeningChange}
    />
  );

  const keyboardOpen = p.kbInset > 0;
  const hideBottomChrome = keyboardOpen || (p.bodyFocused && !p.inlineChatMode);
  const showComposeMap = !hideBottomChrome && !p.inlineChatMode && !p.isListening;

  const mobileKeyboardLayout = journalComposeUsesVisualViewportLayout({
    isMobile: p.isMobile,
    inMiniPhone: p.inMiniPhone,
    keyboardOpen,
  });

  return (
    <div
      className={journalEntryPageRoot(showHubShell, p.inMiniPhone)}
      data-journal-entry-page
      style={mobileVisualViewportPageStyle({
        keyboardInset: p.kbInset,
        offsetTop: p.vvOffsetTop,
        viewportHeight: p.viewportHeight,
        enabled: mobileKeyboardLayout,
      })}
    >
      <header
        className={cn(
          "sticky top-0 z-20 shrink-0 bg-background/85 backdrop-blur-xl border-b border-border/60",
          journalEntryHeaderPad(showHubShell, p.inMiniPhone),
        )}
        style={
          !p.inMiniPhone && !p.isMobile && p.vvOffsetTop > 0 ? { top: p.vvOffsetTop } : undefined
        }
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
          {!p.isMobile && !p.inMiniPhone ? (
            <AiWritingAssistToolbarButton className="h-9 w-9 inline-flex items-center justify-center rounded-full" />
          ) : null}
          <JournalPrivacyBlurToggle />
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
        <div className="max-w-3xl mx-auto px-3 sm:px-5 pb-1.5 flex items-center gap-2 text-[12px] text-muted-foreground">
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
        className="flex-1 min-h-0 max-w-3xl w-full mx-auto px-3 sm:px-5 pt-3 overflow-y-auto overscroll-contain"
        style={{
          paddingBottom: journalComposeMainPaddingBottom({
            bodyFocused: p.bodyFocused,
            hideBottomChrome,
            inMiniPhone: p.inMiniPhone,
            inlineChatMode: p.inlineChatMode,
            isMobile: p.isMobile,
            keyboardOpen,
            viewportHeight: p.viewportHeight,
          }),
        }}
        onPointerDown={(e) => {
          if (p.inlineChatMode) return;
          const target = e.target as HTMLElement;
          if (
            target.closest(
              "textarea, input, button, a, label, [role='button'], [data-journal-compose-map]",
            )
          ) {
            return;
          }
          p.focusBodyEditor();
        }}
      >
        {!p.editId && !p.entryKind ? (
          <p className="mb-3 text-[13px] text-muted-foreground leading-snug rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            {JOURNAL_COMPOSE_HINT}{" "}
            <Link to="/living-hope" className="text-primary font-medium hover:underline">
              Open First Light
            </Link>
          </p>
        ) : null}
        <div className="relative">
          {!p.title.trim() ? (
            <span
              aria-hidden
              className={cn(
                journalEntryTitleInputClass,
                "pointer-events-none absolute inset-x-0 top-0 z-0 text-muted-foreground/55",
              )}
            >
              Title
            </span>
          ) : null}
          <PrivacyBlurInput
            value={p.title}
            onChange={(e) => {
              p.markTitleEdited();
              p.setTitle(e.target.value);
            }}
            aria-label="Title"
            className={cn(
              journalEntryTitleInputClass,
              "relative z-[1] border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
          />
        </div>

        <PrivateJournalCryptoBanner journalId={p.journalId} />

        <NewJournalEntryBodyEditor
          editId={p.editId}
          isListening={p.isListening}
          inlineChatMode={p.inlineChatMode}
          bodyFocused={p.bodyFocused}
          showLocationMap={showComposeMap}
          body={p.body}
          onBodyChange={p.handleBodyChange}
          summary={p.summary}
          onSummaryChange={p.setSummary}
          videoSummarizing={p.videoSummarizing}
          onBodyKeyDown={p.handleBodyKeyDown}
          onBodySelect={p.handleBodySelect}
          bodyPlaceholder={p.bodyPlaceholder}
          markerMenu={p.markerMenu}
          onMarkerPick={p.handleMarkerPick}
          listeningSections={p.listeningSections}
          setListeningSection={p.setListeningSection}
          onUseSpiritQuestion={p.isListening ? p.useSpiritQuestion : undefined}
          chatScrollRef={p.chatScrollRef}
          chatBottomRef={p.chatBottomRef}
          chatTurns={p.chatTurns}
          aiBusy={p.aiBusy}
          streamingAssistantId={p.streamingAssistantId}
          dictInterim={p.dictInterim}
          dictationFormatting={p.dictationFormatting}
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
          showPhotoSuggestion={p.showPhotoSuggestion}
          onAddPhotos={p.triggerPhotos}
          onTakePhoto={p.triggerCamera}
          onDismissPhotoSuggestion={p.dismissPhotoSuggestion}
          videos={p.videos}
          onRemoveVideo={async (id, path) => {
            try {
              await p.removeVideo(id, path);
            } catch (e) {
              toast({
                title: "Couldn't remove video",
                description: e instanceof Error ? e.message : "Try again",
                variant: "destructive",
              });
            }
          }}
          onCaretChange={p.handleCaretChange}
        />
      </main>

      <input
        ref={p.photoInputRef}
        type="file"
        accept="image/*,image/heic,image/heif,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => {
          p.handlePhotoInputChange(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={p.photoCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
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

      <div
        ref={p.bottomDockRef}
        className={hubShellBottomDock(
          showHubShell,
          cn("z-30 flex flex-col justify-end px-3 sm:px-5", hideBottomChrome && "hidden"),
          p.inMiniPhone,
        )}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
        }}
      >
        {showComposeMap ? (
          <div className="pointer-events-auto w-full max-w-3xl mx-auto mb-2">
            <NewJournalEntryLocationMap
              lat={p.lat}
              lng={p.lng}
              inMiniPhone={p.inMiniPhone}
              isMobile={p.isMobile}
              docked
            />
          </div>
        ) : null}
        <nav
          aria-label="Journal tools"
          className="pointer-events-none flex justify-center w-full pt-2"
        >
        <div className="pointer-events-auto w-full max-w-3xl">
          {p.inlineChatMode ? (
            <>
              {p.aiBusy ? (
                <div className="mb-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={p.stopAiReply}
                  >
                    <Square className="mr-1 h-3 w-3" /> Stop
                  </Button>
                </div>
              ) : null}
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
                onRetryLast={() => void p.retryLastAiReply()}
                canRetryLast={p.chatTurns.some((turn) => turn.role === "assistant")}
                trailingControls={
                  <Button
                    type="button"
                    size="icon"
                    variant={p.voiceReplies ? "default" : "ghost"}
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-full",
                      p.voiceReplies
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-label="Toggle voice replies"
                    aria-pressed={p.voiceReplies}
                    onClick={() => p.setVoiceReplies(!p.voiceReplies)}
                  >
                    <AudioLines className="h-4 w-4" />
                  </Button>
                }
              />
            </>
          ) : (
            <NewJournalEntryToolbar
              onPhotos={p.triggerPhotos}
              onWrite={p.triggerHandwritten}
              onVideo={() => void p.triggerVideo()}
              onAudio={p.triggerAudio}
              onChat={() => void p.openChatMode()}
              onMore={() => p.setMoreOpen(true)}
              chatDisabled={!p.canReplyWithAi}
              videoDisabled={!p.videoCaptureSupported || p.inlineChatMode || p.isListening || p.isVent}
            />
          )}
        </div>
      </nav>
      </div>

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
            {!p.inlineChatMode && !p.isListening ? (
              <MobileJournalMoreTools
                onPrompts={() => {
                  p.setMoreOpen(false);
                  p.triggerPrompts();
                }}
                onInsert={(before, after, placeholder) => {
                  p.insertAtCursor(before, after, placeholder);
                  p.setMoreOpen(false);
                }}
                onTags={() => {
                  document.getElementById("journal-more-tags")?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }}
                onScore={() => void p.scoreNow()}
                scoring={p.scoring}
                scoreDisabled={!p.activeEntryId}
                formattingDisabled={p.inlineChatMode || p.isListening}
              />
            ) : null}

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

            <section id="journal-more-tags">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
              <div className="mt-2">
                <TagInput tags={p.tags} onChange={p.handleTagsManualChange} />
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
                <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
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
          </div>
        </SheetContent>
      </Sheet>

      {p.videoOpen ? (
        <JournalVideoCaptureDialog
          open={p.videoOpen}
          onOpenChange={(open) => {
            if (!open && !p.videoUploading && !p.videoTranscribing && !p.videoSummarizing) {
              p.handleVideoRecordingCancelled();
            }
            p.setVideoOpen(open);
          }}
          onComplete={p.handleVideoComplete}
          uploading={p.videoUploading}
          transcribing={p.videoTranscribing || p.videoSummarizing}
          transcribingLabel={p.videoSummarizing ? "Summarizing…" : undefined}
          defaultMode="camera"
          onRecordingStart={p.handleVideoRecordingStart}
          onLiveTranscript={p.handleVideoLiveTranscript}
          recovery={
            p.user?.id && p.activeEntryId
              ? {
                  userId: p.user.id,
                  entryId: p.activeEntryId,
                  anchorOffset: p.videoAnchorRef.current,
                }
              : undefined
          }
        />
      ) : null}

      <SketchPad
        open={p.sketchOpen}
        onClose={() => p.setSketchOpen(false)}
        draftKey={p.sketchDraftKey}
        clearDraftOnSave={Boolean(p.editId)}
        defaultTool="fineline"
        defaultColor="#000000"
        defaultSize={4}
        defaultToolbarCollapsed
        toolbarPlacement="bottom"
        onAutosave={p.editId && p.user ? p.handleSketchAutosave : undefined}
        onSave={p.handleSketchSave}
        onUnsavedExit={p.handleSketchUnsavedExit}
        filename={p.editId ? `sketch-${p.editId}` : undefined}
      />
    </div>
  );
}

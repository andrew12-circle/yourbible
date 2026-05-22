import { Link } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import QuickBeliefDialog from "@/components/framework/QuickBeliefDialog";
import type { BeliefInfluenceAttachment } from "@/lib/framework/quickBelief";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { countTimedTranscriptLines } from "@/lib/normalizePastedTranscript";
type Props = {
  pasteOpen: boolean;
  onPasteOpenChange: (open: boolean) => void;
  pasteText: string;
  onPasteTextChange: (v: string) => void;
  onPasteTranscriptInput: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  pasteTimestampsNormalized: boolean;
  normalizedPastePreview: string;
  savingPaste: boolean;
  onSubmitPasted: () => void;
  wrapUpOpen: boolean;
  onWrapUpOpenChange: (open: boolean) => void;
  claimsCount: number;
  onWrapUpBackToArtifacts: () => void;
  polling: boolean;
  quickBeliefOpen: boolean;
  onQuickBeliefOpenChange: (open: boolean) => void;
  quickBeliefText: string;
  quickBeliefSource: string;
  quickBeliefInfluence: BeliefInfluenceAttachment | null;
};

export default function ArtifactDetailPageDialogs({
  pasteOpen,
  onPasteOpenChange,
  pasteText,
  onPasteTextChange,
  onPasteTranscriptInput,
  pasteTimestampsNormalized,
  normalizedPastePreview,
  savingPaste,
  onSubmitPasted,
  wrapUpOpen,
  onWrapUpOpenChange,
  claimsCount,
  onWrapUpBackToArtifacts,
  polling,
  quickBeliefOpen,
  onQuickBeliefOpenChange,
  quickBeliefText,
  quickBeliefSource,
  quickBeliefInfluence,
}: Props) {
  return (
    <>
      <Dialog
        open={pasteOpen}
        onOpenChange={(open) => {
          onPasteOpenChange(open);
          if (!open) onPasteTextChange("");
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Paste full transcript</DialogTitle>
            <DialogDescription>
              Copy the entire transcript from YouTube (⋮ → Show transcript, select all) or any transcript tool, then paste below.
              We will save it and run the analyzer.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => onPasteTextChange(e.target.value)}
            onPaste={onPasteTranscriptInput}
            rows={18}
            placeholder={"[0:00] Opening line…\n[0:15] Next phrase…\n\nPlain text without timestamps also works."}
            className="font-mono text-sm resize-y min-h-[280px] flex-1"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground tabular-nums">
            {pasteText.length.toLocaleString()} characters
            {pasteText.trim() ? ` · ~${pasteText.trim().split(/\s+/).length.toLocaleString()} words` : ""}
            {pasteTimestampsNormalized ? (
              <span className="text-foreground">
                {" "}
                · Timestamps will normalize to [M:SS] ({countTimedTranscriptLines(normalizedPastePreview)} lines)
              </span>
            ) : null}
          </p>
          {pasteTimestampsNormalized ? (
            <pre className="max-h-24 overflow-auto rounded border border-border bg-muted/40 p-2 font-mono text-[11px] leading-snug text-muted-foreground">
              {normalizedPastePreview.slice(0, 500)}
              {normalizedPastePreview.length > 500 ? "…" : ""}
            </pre>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => onPasteOpenChange(false)} disabled={savingPaste}>
              Cancel
            </Button>
            <Button onClick={onSubmitPasted} disabled={savingPaste || !pasteText.trim()}>
              {savingPaste ? "Saving…" : "Save & analyze"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {polling ? (
        <p className="mt-6 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Watching for new claims…
        </p>
      ) : null}

      <Dialog open={wrapUpOpen} onOpenChange={onWrapUpOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Wrap up studying?</DialogTitle>
            <DialogDescription>
              A quick checkpoint — nothing is saved automatically here; use it to close the loop in your head.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
              <span>Reviewed claim cards (Keep / Reject / Update / Defer) where it helped</span>
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
              <span>Saved bookmarks or notes in Capture, if you wanted a paper trail</span>
            </li>
          </ul>
          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button type="button" className="w-full sm:w-auto" onClick={onWrapUpBackToArtifacts}>
              Back to artifacts
            </Button>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onWrapUpOpenChange(false)}
              >
                Stay here
              </Button>
              {claimsCount > 0 ? (
                <Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
                  <Link to="/framework/graph" onClick={() => onWrapUpOpenChange(false)}>
                    Open belief graph
                  </Link>
                </Button>
              ) : null}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickBeliefDialog
        open={quickBeliefOpen}
        onOpenChange={onQuickBeliefOpenChange}
        initialText={quickBeliefText}
        initialSource={quickBeliefSource}
        influenceAttachment={quickBeliefInfluence}
      />
    </>
  );
}

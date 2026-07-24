import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { VisionBoardCanvas } from "@/components/vision-board/VisionBoardCanvas";
import { VisionBoardToolbar } from "@/components/vision-board/VisionBoardToolbar";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { useVisionBoard } from "@/hooks/useVisionBoard";
import { hubShellPageRoot } from "@/lib/shell/hubShellClasses";
import { cn } from "@/lib/utils";

export default function VisionBoardPage() {
  const { user, loading: authLoading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const board = useVisionBoard(user?.id);

  if (authLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div
      className={hubShellPageRoot(
        showHubShell,
        "flex h-[100dvh] flex-col overflow-hidden bg-background",
        "flex h-full min-h-0 flex-col overflow-hidden bg-background",
      )}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border/60 px-3 py-2",
          !showHubShell && "pt-[calc(var(--safe-area-inset-top)+0.5rem)]",
        )}
      >
        <Link
          to="/home"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight">Vision board</h1>
          <p className="truncate text-xs text-muted-foreground">Pin photos, notes, and reminders</p>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col">
        {board.loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <VisionBoardCanvas
              background={board.background}
              items={board.items}
              photoUrls={board.photoUrls}
              selectedId={board.selectedId}
              onSelect={board.setSelectedId}
              onTransformLive={board.onTransformLive}
              onTransformCommit={board.onTransformCommit}
              onNoteTextChange={board.onNoteTextChange}
              onNoteColorChange={board.onNoteColorChange}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(0.75rem,var(--safe-area-inset-bottom))]">
              <div className="pointer-events-auto max-w-full">
                <VisionBoardToolbar
                  background={board.background}
                  onBackgroundChange={(k) => void board.setBackground(k)}
                  onAddPhoto={board.requestAddPhoto}
                  onAddNote={() => void board.addNote()}
                  onAddPin={() => void board.addPin()}
                  onDelete={() => void board.removeSelected()}
                  onBringForward={() => void board.bringSelectedForward()}
                  onSendBackward={() => void board.sendSelectedBackward()}
                  hasSelection={Boolean(board.selectedId)}
                  busy={board.busy}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <input
        ref={board.fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void board.onPhotoFiles(e.target.files)}
      />
    </div>
  );
}

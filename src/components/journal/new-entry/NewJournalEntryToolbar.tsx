import type { ReactNode } from "react";
import {
  ChevronDown,
  Image as ImageIcon,
  MessageCircle,
  Mic,
  PenLine,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Frosted grey dock — matches artifacts library chips and framework tab bar. */
export const journalEntryDockShellClass = cn(
  "rounded-[22px] border border-border/50",
  "bg-muted/35 shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
  "backdrop-blur-md supports-[backdrop-filter]:bg-muted/25",
);

export function JournalEntryDockShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(journalEntryDockShellClass, className)}>{children}</div>;
}

export function ToolbarTile({
  icon,
  label,
  onClick,
  disabled,
  accent,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition text-[11px] font-medium",
        disabled
          ? "text-muted-foreground/40"
          : "text-foreground hover:bg-background/45 active:bg-background/55",
        accent && !disabled && "text-primary",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function NewJournalEntryToolbar({
  onPhotos,
  onWrite,
  onVideo,
  onAudio,
  onChat,
  onMore,
  chatDisabled,
  videoDisabled,
}: {
  onPhotos: () => void;
  onWrite: () => void;
  onVideo: () => void;
  onAudio: () => void;
  onChat: () => void;
  onMore: () => void;
  chatDisabled?: boolean;
  videoDisabled?: boolean;
}) {
  return (
    <JournalEntryDockShell>
      <div className="grid grid-cols-5 gap-0.5 p-1.5">
        <ToolbarTile icon={<ImageIcon className="w-5 h-5" />} label="Photos" onClick={onPhotos} />
        <ToolbarTile icon={<PenLine className="w-5 h-5" />} label="Write" onClick={onWrite} />
        <ToolbarTile
          icon={<Video className="w-5 h-5" />}
          label="Video"
          onClick={onVideo}
          disabled={videoDisabled}
        />
        <ToolbarTile icon={<Mic className="w-5 h-5" />} label="Audio" onClick={onAudio} />
        <ToolbarTile
          icon={<MessageCircle className="w-5 h-5" />}
          label="Chat AI"
          onClick={onChat}
          disabled={chatDisabled}
          accent
        />
      </div>
      <button
        type="button"
        onClick={onMore}
        className="flex w-full items-center justify-center gap-1 border-t border-border/35 py-1.5 text-[12px] text-muted-foreground transition hover:bg-background/35 hover:text-foreground"
      >
        <ChevronDown className="w-3.5 h-3.5" /> More
      </button>
    </JournalEntryDockShell>
  );
}

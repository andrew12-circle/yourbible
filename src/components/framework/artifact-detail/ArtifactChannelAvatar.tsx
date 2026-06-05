import { useState } from "react";
import { cn } from "@/lib/utils";

function channelInitial(channel: string): string {
  const trimmed = channel.trim();
  if (!trimmed) return "?";
  const first = trimmed.replace(/^@/, "").charAt(0);
  return first ? first.toUpperCase() : "?";
}

export type ArtifactChannelAvatarProps = {
  channel?: string | null;
  channelThumbnailUrl?: string | null;
  className?: string;
};

export default function ArtifactChannelAvatar({
  channel,
  channelThumbnailUrl,
  className,
}: ArtifactChannelAvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = channel?.trim() || "Channel";

  if (channelThumbnailUrl?.trim() && !failed) {
    return (
      <img
        src={channelThumbnailUrl.trim()}
        alt=""
        className={cn("shrink-0 rounded-full object-cover ring-1 ring-border/60 bg-muted", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-border/60",
        className,
      )}
      aria-hidden
    >
      {channelInitial(label)}
    </span>
  );
}

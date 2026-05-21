import { LocateFixed, Pause, Play } from "lucide-react";
import ClaimIconActionButton from "@/components/framework/ClaimIconActionButton";
import { sectionLabel } from "@/lib/framework/artifactSurfaces";

type Props = {
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
  showPlaybackControl?: boolean;
  followPlayback: boolean;
  onToggleFollowPlayback: () => void;
  showFollowControl: boolean;
  timedClaimsCount: number;
};

export default function ClaimsPlaybackToolbar({
  isPlaying = false,
  onTogglePlayback,
  showPlaybackControl = false,
  followPlayback,
  onToggleFollowPlayback,
  showFollowControl,
  timedClaimsCount,
}: Props) {
  if (!showPlaybackControl && !showFollowControl) return null;

  return (
    <div className="mb-3 space-y-2 border-b border-amber-200/50 pb-3 dark:border-amber-900/40">
      <p className={sectionLabel}>
        {timedClaimsCount > 0
          ? "Follow along while the video plays — the active claim updates with the playhead."
          : "Re-analyze after a timestamped transcript to link claims to playback times."}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {showPlaybackControl && onTogglePlayback ? (
          <ClaimIconActionButton
            label={isPlaying ? "Pause video" : "Play video"}
            icon={isPlaying ? Pause : Play}
            tone="researchLater"
            active={isPlaying}
            onClick={onTogglePlayback}
          />
        ) : null}
        {showFollowControl ? (
          <ClaimIconActionButton
            label={followPlayback ? "Following playback" : "Follow playback"}
            icon={LocateFixed}
            tone="researchLater"
            active={followPlayback}
            onClick={onToggleFollowPlayback}
          />
        ) : null}
      </div>
    </div>
  );
}

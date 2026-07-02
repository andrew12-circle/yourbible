import { forwardRef, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Camera,
  ChevronDown,
  FlipHorizontal,
  Loader2,
  Mic,
  Monitor,
  Pause,
  PictureInPicture2,
  Play,
  Settings2,
  SkipForward,
  Square,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JournalVideoMicMeter } from "@/components/journal/JournalVideoMicMeter";
import type { UseJournalVideoCaptureApi } from "@/hooks/useJournalVideoCapture";
import { useMicLevel } from "@/hooks/useMicLevel";
import { listAudioInputDevices, listVideoInputDevices } from "@/lib/journal/journalVideoDevices";
import type {
  BubbleCorner,
  BubbleSize,
  JournalVideoCountdown,
  JournalVideoQuality,
} from "@/lib/journal/journalVideoCaptureSettings";
import { writeJournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import { cn } from "@/lib/utils";

type Props = {
  capture: UseJournalVideoCaptureApi;
  isMobile: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  active?: boolean;
  paused?: boolean;
  processing?: boolean;
  /** Preview is ready but countdown was paused — show Start button. */
  countdownDeferred?: boolean;
  onStartCountdown?: () => void;
  onPauseResume?: () => void;
  onStop?: () => void;
};

function SmartBarDivider() {
  return <div className="mx-0.5 h-6 w-px shrink-0 bg-white/20" aria-hidden />;
}

const SmartBarIconButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    title?: string;
    onClick?: () => void;
    disabled?: boolean;
    children: React.ReactNode;
  }
>(function SmartBarIconButton({ label, title, onClick, disabled, children }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      size="icon"
      variant="ghost"
      className="h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/20 hover:text-white disabled:opacity-40"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </Button>
  );
});

function deviceLabel(device: MediaDeviceInfo, fallback: string): string {
  return device.label?.trim() || fallback;
}

/** Unified recorder bar: camera/source controls, quality, settings, and pause/stop transport. */
export function JournalVideoCaptureToolbar({
  capture,
  isMobile,
  videoRef,
  className,
  active = false,
  paused = false,
  processing = false,
  countdownDeferred = false,
  onStartCountdown,
  onPauseResume,
  onStop,
}: Props) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const previewActive =
    capture.phase === "recording" ||
    capture.phase === "paused" ||
    capture.phase === "preview" ||
    capture.phase === "countdown";
  const micMeterActive =
    capture.phase === "preview" || capture.phase === "countdown" || capture.phase === "recording";
  const micLevel = useMicLevel(capture.previewStream, micMeterActive);
  const settingsLocked = capture.phase === "recording" || capture.phase === "paused";
  const showCountdown = capture.phase === "countdown";
  const showPreviewStart = capture.phase === "preview" && countdownDeferred && !processing;

  const activeVideoDeviceId = useMemo(
    () => capture.previewStream?.getVideoTracks()[0]?.getSettings().deviceId ?? capture.deviceId ?? "",
    [capture.previewStream, capture.deviceId],
  );
  const activeAudioDeviceId = useMemo(
    () =>
      capture.previewStream?.getAudioTracks()[0]?.getSettings().deviceId ?? capture.audioDeviceId ?? "",
    [capture.previewStream, capture.audioDeviceId],
  );
  const activeAudioLabel = useMemo(() => {
    const match = audioDevices.find((d) => d.deviceId === activeAudioDeviceId);
    if (match?.label) return match.label;
    const trackLabel = capture.previewStream?.getAudioTracks()[0]?.label;
    return trackLabel?.trim() || "Default microphone";
  }, [audioDevices, activeAudioDeviceId, capture.previewStream]);

  useEffect(() => {
    if (!previewActive) return;
    void listVideoInputDevices().then(setVideoDevices);
    void listAudioInputDevices().then(setAudioDevices);
  }, [previewActive, capture.previewStream]);

  const persist = (patch: Parameters<typeof writeJournalVideoCaptureSettings>[0]) => {
    const next = writeJournalVideoCaptureSettings(patch);
    capture.patchSettings(next);
  };

  const cycleQuality = () => {
    const next: JournalVideoQuality = capture.settings.quality === "720p" ? "1080p" : "720p";
    persist({ quality: next });
  };

  const enterPip = async () => {
    const el = videoRef.current;
    if (!el || !document.pictureInPictureEnabled) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await el.requestPictureInPicture();
      }
    } catch {
      /* unsupported or denied */
    }
  };

  const showCameraControls = capture.mode === "camera";
  const showScreenControls = capture.mode === "screen";

  return (
    <div
      className={cn(
        "inline-flex max-w-[min(100%,42rem)] items-center gap-1 overflow-x-auto rounded-full",
        "bg-black/55 px-2 py-1.5 shadow-lg backdrop-blur-md",
        "scrollbar-none [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-0.5">
        {showPreviewStart && onStartCountdown ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
            onClick={onStartCountdown}
          >
            <Video className="h-3.5 w-3.5" />
            Start countdown
          </Button>
        ) : null}

        {showCountdown ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 shrink-0 gap-1 rounded-full px-3 text-xs"
            onClick={capture.skipCountdown}
          >
            <SkipForward className="h-3.5 w-3.5" />
            Start now
          </Button>
        ) : null}

        {previewActive ? (
          <div className="mx-1 flex flex-col items-center gap-0.5" title={activeAudioLabel}>
            <JournalVideoMicMeter level={micLevel} />
            {!active && !showCountdown ? (
              <span className="max-w-[5.5rem] truncate text-[9px] text-white/70">{activeAudioLabel}</span>
            ) : null}
          </div>
        ) : null}

        {active ? (
          <SmartBarIconButton label="Mark chapter" onClick={() => capture.markChapter()}>
            <Bookmark className="h-4 w-4" />
          </SmartBarIconButton>
        ) : null}

        {showCameraControls ? (
          <>
            {isMobile ? (
              <SmartBarIconButton
                label="Flip camera"
                onClick={() => void capture.switchFacing()}
                disabled={settingsLocked}
              >
                <FlipHorizontal className="h-4 w-4" />
              </SmartBarIconButton>
            ) : videoDevices.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 max-w-[128px] shrink-0 gap-1 rounded-full px-2.5 text-xs text-white hover:bg-white/20 hover:text-white disabled:opacity-40"
                    disabled={settingsLocked}
                  >
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Webcam</span>
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuLabel>Camera</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={activeVideoDeviceId}
                    onValueChange={(id) => void capture.selectDevice(id)}
                  >
                    {videoDevices.map((d) => (
                      <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
                        {deviceLabel(d, `Camera ${d.deviceId.slice(0, 6)}`)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SmartBarIconButton label="Webcam" disabled={settingsLocked}>
                <Camera className="h-4 w-4" />
              </SmartBarIconButton>
            )}
          </>
        ) : null}

        {showScreenControls && active ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SmartBarIconButton label="Camera bubble layout">
                <Monitor className="h-4 w-4" />
              </SmartBarIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Camera bubble</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={capture.settings.bubbleCorner}
                onValueChange={(v) => {
                  capture.setBubbleLayout({ corner: v as BubbleCorner });
                  persist({ bubbleCorner: v as BubbleCorner });
                }}
              >
                <DropdownMenuRadioItem value="bottom-left">Bottom left</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bottom-right">Bottom right</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="top-left">Top left</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="top-right">Top right</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={capture.settings.bubbleSize}
                onValueChange={(v) => {
                  capture.setBubbleLayout({ size: v as BubbleSize });
                  persist({ bubbleSize: v as BubbleSize });
                }}
              >
                <DropdownMenuRadioItem value="sm">Small</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="md">Medium</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="lg">Large</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  const visible = !capture.settings.bubbleVisible;
                  capture.setBubbleLayout({ visible });
                  persist({ bubbleVisible: visible });
                }}
              >
                {capture.settings.bubbleVisible ? "Hide bubble" : "Show bubble"}
              </Button>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {document.pictureInPictureEnabled && capture.phase === "recording" ? (
          <SmartBarIconButton label="Picture in picture" onClick={() => void enterPip()}>
            <PictureInPicture2 className="h-4 w-4" />
          </SmartBarIconButton>
        ) : null}
      </div>

      {!settingsLocked ? (
        <>
          <SmartBarDivider />
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold tabular-nums text-white hover:bg-white/20 hover:text-white"
              onClick={cycleQuality}
              aria-label={`Video quality ${capture.settings.quality}. Tap to switch.`}
              title="Tap to switch quality"
            >
              {capture.settings.quality}
            </Button>
          </div>
        </>
      ) : null}

      {active || processing ? (
        <>
          <SmartBarDivider />
          <div className="flex shrink-0 items-center gap-1">
            {processing ? (
              <div className="flex h-9 w-9 items-center justify-center text-white/90">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : onPauseResume && onStop ? (
              <>
                <SmartBarIconButton
                  label={paused ? "Resume recording" : "Pause recording"}
                  onClick={onPauseResume}
                >
                  {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </SmartBarIconButton>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-full bg-red-500/90 text-white hover:bg-red-500 hover:text-white"
                  onClick={onStop}
                  aria-label="Stop recording"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              </>
            ) : null}
          </div>
        </>
      ) : null}

      <SmartBarDivider />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SmartBarIconButton label="Recording settings" disabled={settingsLocked}>
            <Settings2 className="h-4 w-4" />
          </SmartBarIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[min(70vh,28rem)] overflow-y-auto">
          <DropdownMenuLabel>Quality</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={capture.settings.quality}
            onValueChange={(v) => persist({ quality: v as JournalVideoQuality })}
          >
            <DropdownMenuRadioItem value="720p">720p HD</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1080p">1080p Full HD</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Countdown</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={String(capture.settings.countdown)}
            onValueChange={(v) => persist({ countdown: Number(v) as JournalVideoCountdown })}
          >
            <DropdownMenuRadioItem value="0">None — start immediately</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="1">1 second</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="3">3 seconds</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="5">5 seconds</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          {!isMobile && audioDevices.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5" />
                Microphone
              </DropdownMenuLabel>
              <div className="px-2 pb-2">
                <div className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5">
                  <JournalVideoMicMeter level={micLevel} className="[&_span]:bg-muted-foreground/40 [&_span.bg-emerald-400]:bg-emerald-500" />
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{activeAudioLabel}</span>
                </div>
                <p className="mt-1 px-0.5 text-[10px] leading-snug text-muted-foreground">
                  Speak to test your mic — green bars mean it is picking you up.
                </p>
              </div>
              <DropdownMenuRadioGroup
                value={activeAudioDeviceId}
                onValueChange={(id) => {
                  persist({ audioDeviceId: id });
                  void capture.selectAudioDevice(id);
                }}
              >
                {audioDevices.map((d) => (
                  <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
                    {deviceLabel(d, `Microphone ${d.deviceId.slice(0, 6)}`)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          ) : null}
          {!isMobile ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Desktop</DropdownMenuLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => persist({ floatingRecorder: !capture.settings.floatingRecorder })}
              >
                {capture.settings.floatingRecorder ? "Floating recorder on" : "Floating recorder off"}
              </Button>
              {showScreenControls ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => persist({ includeSystemAudio: !capture.settings.includeSystemAudio })}
                >
                  {capture.settings.includeSystemAudio ? "System audio on" : "Mic only"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => persist({ silenceAutoPause: !capture.settings.silenceAutoPause })}
              >
                {capture.settings.silenceAutoPause ? "Auto-pause on silence" : "Silence auto-pause off"}
              </Button>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

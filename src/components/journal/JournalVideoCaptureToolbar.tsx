import { useEffect, useState } from "react";
import {
  Bookmark,
  Camera,
  ChevronDown,
  FlipHorizontal,
  Monitor,
  PictureInPicture2,
  Settings2,
  SkipForward,
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
import { listVideoInputDevices } from "@/lib/journal/journalVideoDevices";
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
};

export function JournalVideoCaptureToolbar({
  capture,
  isMobile,
  videoRef,
  className,
}: Props) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const active =
    capture.phase === "recording" ||
    capture.phase === "paused" ||
    capture.phase === "preview" ||
    capture.phase === "countdown";
  const micLevel = useMicLevel(capture.previewStream, capture.phase === "recording");

  useEffect(() => {
    if (!active) return;
    void listVideoInputDevices().then(setDevices);
  }, [active, capture.previewStream]);

  const persist = (patch: Parameters<typeof writeJournalVideoCaptureSettings>[0]) => {
    const next = writeJournalVideoCaptureSettings(patch);
    capture.patchSettings(next);
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
        "flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-black/50 px-2 py-1.5 backdrop-blur-sm",
        className,
      )}
    >
      {capture.phase === "countdown" ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 gap-1 rounded-full text-xs"
          onClick={capture.skipCountdown}
        >
          <SkipForward className="h-3.5 w-3.5" />
          Start now
        </Button>
      ) : null}

      {capture.phase === "recording" || capture.phase === "paused" ? (
        <>
          <JournalVideoMicMeter level={micLevel} className="mx-1" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
            onClick={() => capture.markChapter()}
            aria-label="Mark chapter"
            title="Mark chapter"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      {showCameraControls ? (
        <>
          {isMobile ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
              onClick={() => void capture.switchFacing()}
              disabled={capture.phase === "recording" || capture.phase === "paused"}
              aria-label="Flip camera"
            >
              <FlipHorizontal className="h-4 w-4" />
            </Button>
          ) : devices.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 max-w-[140px] gap-1 rounded-full text-xs text-white hover:bg-white/20 hover:text-white"
                  disabled={capture.phase === "recording" || capture.phase === "paused"}
                >
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Webcam</span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuLabel>Camera</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={capture.deviceId ?? ""}
                  onValueChange={(id) => void capture.selectDevice(id)}
                >
                  {devices.map((d) => (
                    <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </>
      ) : null}

      {showScreenControls && (capture.phase === "recording" || capture.phase === "paused") ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
              aria-label="Bubble layout"
            >
              <Monitor className="h-4 w-4" />
            </Button>
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
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
          onClick={() => void enterPip()}
          aria-label="Picture in picture"
        >
          <PictureInPicture2 className="h-4 w-4" />
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-white hover:bg-white/20 hover:text-white"
            aria-label="Recording settings"
            disabled={capture.phase === "recording" || capture.phase === "paused"}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
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
          {!isMobile ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Desktop</DropdownMenuLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  persist({ floatingRecorder: !capture.settings.floatingRecorder })
                }
              >
                {capture.settings.floatingRecorder ? "Floating recorder on" : "Floating recorder off"}
              </Button>
              {showScreenControls ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() =>
                    persist({ includeSystemAudio: !capture.settings.includeSystemAudio })
                  }
                >
                  {capture.settings.includeSystemAudio ? "System audio on" : "Mic only"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  persist({ silenceAutoPause: !capture.settings.silenceAutoPause })
                }
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

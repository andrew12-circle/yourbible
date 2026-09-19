import { useEffect, useId, useState } from "react";
import { Bookmark, FlipHorizontal, Loader2, Pause, Play, Settings2, Square, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { JournalVideoLiveMicWaveform } from "./JournalVideoLiveMicWaveform";
import type { UseJournalVideoCaptureApi } from "@/hooks/useJournalVideoCapture";
import { listAudioInputDevices, listVideoInputDevices } from "@/lib/journal/journalVideoDevices";
import { canChangeJournalVideoDevices } from "@/lib/journal/journalVideoLiveDevices";
import { writeJournalVideoCaptureSettings, type JournalVideoCaptureSettings, type JournalVideoQuality,
  type JournalVideoCountdown, type BubbleCorner, type BubbleSize } from "@/lib/journal/journalVideoCaptureSettings";
import { cn } from "@/lib/utils";

type Props = {
  capture: UseJournalVideoCaptureApi;
  isMobile: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
  active?: boolean;
  paused?: boolean;
  processing?: boolean;
  countdownDeferred?: boolean;
  onStartCountdown?: () => void;
  onPauseResume?: () => void;
  onStop?: () => void;
  menuElevated?: boolean;
};

/** Transport stays visible; optional controls live in one keyboard/touch-accessible settings panel. */
export function JournalVideoCaptureToolbar({
  capture, isMobile, className, active = false, paused = false, processing = false,
  countdownDeferred = false, onStartCountdown, onPauseResume, onStop, menuElevated = true,
}: Props) {
  const id = useId();
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const previewActive = ["preview", "countdown", "recording", "paused"].includes(capture.phase);
  const devicesLocked = !canChangeJournalVideoDevices(capture.phase) || processing || Boolean(capture.configuringQuality);
  const screenCapture = capture.mode === "screen";
  const videoTrack = capture.previewStream?.getVideoTracks()[0];
  const audioTrack = capture.previewStream?.getAudioTracks()[0];
  const cameraId = videoTrack?.getSettings().deviceId ?? capture.deviceId ?? "";
  const microphoneId = audioTrack?.getSettings().deviceId ?? capture.audioDeviceId ?? "";
  const resolution = capture.captureResolution;
  const persist = (patch: Partial<JournalVideoCaptureSettings>) => {
    writeJournalVideoCaptureSettings(patch);
    capture.patchSettings(patch);
  };

  useEffect(() => {
    if (!previewActive) return;
    let disposed = false;
    const refresh = () => {
      void listVideoInputDevices().then((devices) => { if (!disposed) setVideoDevices(devices); }).catch(() => undefined);
      void listAudioInputDevices().then((devices) => { if (!disposed) setAudioDevices(devices); }).catch(() => undefined);
    };
    refresh();
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
    return () => { disposed = true; navigator.mediaDevices?.removeEventListener?.("devicechange", refresh); };
  }, [previewActive, capture.previewStream]);

  const selectClass = "h-11 w-full min-w-0 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50";
  return (
    <div className={cn("inline-flex max-w-full items-center gap-2 overflow-hidden rounded-2xl bg-black/65 p-2 text-white shadow-lg backdrop-blur-md", className)}>
      <div className="hidden min-w-0 shrink items-center min-[360px]:flex" title={audioTrack?.label || "Microphone level"}>
        {previewActive ? <JournalVideoLiveMicWaveform stream={capture.previewStream} active={previewActive} maxBarHeight={18} /> : null}
      </div>
      {capture.phase === "preview" && countdownDeferred && onStartCountdown ? (
        <Button type="button" className="h-11 gap-2" variant="secondary" disabled={devicesLocked} onClick={onStartCountdown}>
          <Video className="h-4 w-4" />{capture.settings.countdown === 0 ? "Start recording" : "Start countdown"}
        </Button>
      ) : null}
      {capture.phase === "countdown" && capture.countdown != null ? (
        <Button type="button" className="h-11" variant="secondary" disabled={Boolean(capture.configuringQuality)} onClick={capture.skipCountdown}>Start now</Button>
      ) : null}
      {processing ? <div className="flex h-11 items-center gap-2 text-sm"><Loader2 className="h-5 w-5 animate-spin" />Finishing…</div> : active ? (
        <div className="flex shrink-0 items-center gap-2" data-video-transport>
          <Button type="button" variant="ghost" className="h-11 min-w-11 gap-2 px-3 text-white hover:bg-white/20 hover:text-white"
            aria-label={paused ? "Resume recording" : "Pause recording"}
            disabled={!onPauseResume || (paused && !capture.canResume)} onClick={onPauseResume}>
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            <span className="hidden min-[380px]:inline">{paused ? "Resume" : "Pause"}</span>
          </Button>
          <Button type="button" className="h-11 gap-2 bg-red-600 px-3 text-white hover:bg-red-700"
            aria-label="Stop recording" onClick={onStop} disabled={!onStop}>
            <Square className="h-4 w-4 fill-current" /><span>Stop &amp; review</span>
          </Button>
        </div>
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" className="h-11 w-11 shrink-0 rounded-full p-0 text-white hover:bg-white/20 hover:text-white"
            aria-label="Recording settings" disabled={processing}><Settings2 className="h-5 w-5" /></Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className={cn("w-[min(340px,calc(100vw-2rem))] max-h-[min(70dvh,34rem)] overflow-y-auto overscroll-contain space-y-4", menuElevated && "z-[250]")}>
          <div>
            <p className="font-semibold">Recording settings</p>
            {active ? <p className="mt-1 text-xs text-muted-foreground">Camera, microphone, and quality are locked until this take is finished. Pausing does not unlock them.</p> : null}
          </div>
          <div className="space-y-1">
            <label htmlFor={`${id}-camera`} className="text-sm font-medium">Camera</label>
            <select id={`${id}-camera`} className={selectClass} value={cameraId} disabled={devicesLocked}
              onChange={(event) => void capture.selectDevice(event.target.value)}>
              <option value="">Default camera</option>
              {videoDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>
            {isMobile && !screenCapture ? <Button type="button" variant="outline" className="h-11 w-full gap-2" disabled={devicesLocked}
              onClick={() => void capture.switchFacing()}><FlipHorizontal className="h-4 w-4" />Flip camera</Button> : null}
          </div>
          {capture.screenUsesCameraAudio !== false ? <div className="space-y-1">
            <label htmlFor={`${id}-mic`} className="text-sm font-medium">Microphone</label>
            <select id={`${id}-mic`} className={selectClass} value={microphoneId} disabled={devicesLocked}
              onChange={(event) => { persist({ audioDeviceId: event.target.value || null }); void capture.selectAudioDevice(event.target.value); }}>
              <option value="">Default microphone</option>
              {audioDevices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>)}
            </select>
          </div> : null}
          {!screenCapture ? <div className="space-y-1">
            <label htmlFor={`${id}-quality`} className="text-sm font-medium">Requested resolution</label>
            <select id={`${id}-quality`} className={selectClass} value={capture.settings.quality} disabled={devicesLocked}
              onChange={(event) => persist({ quality: event.target.value as JournalVideoQuality })}>
              <option value="720p">720p</option><option value="1080p">1080p</option>
            </select>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {capture.configuringQuality ? "Applying camera resolution…" : resolution ? `Camera output: ${resolution.width} × ${resolution.height}` : "Actual camera dimensions appear when available."}
            </p>
            <p className="text-xs text-muted-foreground">Video is compressed to fit the recording limit. Resolution alone does not determine detail.</p>
          </div> : <p className="text-xs text-muted-foreground">Screen dimensions follow the shared display.</p>}
          <div className="space-y-1">
            <label htmlFor={`${id}-countdown`} className="text-sm font-medium">Countdown</label>
            <select id={`${id}-countdown`} className={selectClass} value={String(capture.settings.countdown ?? 3)} disabled={devicesLocked}
              onChange={(event) => persist({ countdown: Number(event.target.value) as JournalVideoCountdown })}>
              <option value="0">None</option><option value="1">1 second</option><option value="3">3 seconds</option><option value="5">5 seconds</option>
            </select>
          </div>
          {!screenCapture ? <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" checked={Boolean(capture.settings.silenceAutoPause)}
              onChange={(event) => persist({ silenceAutoPause: event.target.checked })} />
            Pause after 30 seconds of silence
          </label> : null}
          {!isMobile ? <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" disabled={devicesLocked} checked={Boolean(capture.settings.floatingRecorder)}
              onChange={(event) => persist({ floatingRecorder: event.target.checked })} />Floating desktop recorder
          </label> : null}
          {screenCapture ? <>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" disabled={active} checked={Boolean(capture.settings.includeSystemAudio)}
                onChange={(event) => persist({ includeSystemAudio: event.target.checked })} />Include system audio on next screen share
            </label>
            <label className="block space-y-1 text-sm">Camera bubble position
              <select className={selectClass} value={capture.settings.bubbleCorner}
                onChange={(event) => { const corner = event.target.value as BubbleCorner; capture.setBubbleLayout({ corner }); persist({ bubbleCorner: corner }); }}>
                <option value="bottom-left">Bottom left</option><option value="bottom-right">Bottom right</option>
                <option value="top-left">Top left</option><option value="top-right">Top right</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">Camera bubble size
              <select className={selectClass} value={capture.settings.bubbleSize}
                onChange={(event) => { const size = event.target.value as BubbleSize; capture.setBubbleLayout({ size }); persist({ bubbleSize: size }); }}>
                <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(capture.settings.bubbleVisible)}
              onChange={(event) => { capture.setBubbleLayout({ visible: event.target.checked }); persist({ bubbleVisible: event.target.checked }); }} />Show camera bubble</label>
          </> : null}
          {active ? <Button type="button" variant="outline" className="h-11 w-full gap-2" onClick={() => capture.markChapter()}>
            <Bookmark className="h-4 w-4" />Mark chapter{capture.chapters?.length ? ` (${capture.chapters.length})` : ""}
          </Button> : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

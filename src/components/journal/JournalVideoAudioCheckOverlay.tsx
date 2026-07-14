import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, FlipHorizontal, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JournalVideoLiveMicWaveform } from "@/components/journal/JournalVideoLiveMicWaveform";
import type { UseJournalVideoCaptureApi } from "@/hooks/useJournalVideoCapture";
import { listAudioInputDevices, listVideoInputDevices } from "@/lib/journal/journalVideoDevices";
import { writeJournalVideoCaptureSettings } from "@/lib/journal/journalVideoCaptureSettings";
import { cn } from "@/lib/utils";

type Props = {
  capture: UseJournalVideoCaptureApi;
  isMobile: boolean;
  onContinue: () => void;
  className?: string;
};

/** Menus must sit above this overlay (z-20) and any floating recorder. */
const OVERLAY_MENU_Z = "z-[250]";

function deviceLabel(device: MediaDeviceInfo, fallback: string): string {
  return device.label?.trim() || fallback;
}

/**
 * Pre-recording setup: pick the camera and microphone, confirm the mic is
 * picking you up, then continue to the countdown.
 */
export function JournalVideoAudioCheckOverlay({ capture, isMobile, onContinue, className }: Props) {
  const stream = capture.previewStream;
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    void listVideoInputDevices().then(setVideoDevices);
    void listAudioInputDevices().then(setAudioDevices);
  }, [stream]);

  const activeVideoDeviceId = useMemo(
    () => stream?.getVideoTracks()[0]?.getSettings().deviceId ?? capture.deviceId ?? "",
    [stream, capture.deviceId],
  );
  const activeAudioDeviceId = useMemo(
    () => stream?.getAudioTracks()[0]?.getSettings().deviceId ?? capture.audioDeviceId ?? "",
    [stream, capture.audioDeviceId],
  );

  const activeCameraLabel = useMemo(() => {
    const match = videoDevices.find((d) => d.deviceId === activeVideoDeviceId);
    if (match?.label) return match.label;
    const trackLabel = stream?.getVideoTracks()[0]?.label;
    return trackLabel?.trim() || "Default camera";
  }, [videoDevices, activeVideoDeviceId, stream]);
  const activeMicLabel = useMemo(() => {
    const match = audioDevices.find((d) => d.deviceId === activeAudioDeviceId);
    if (match?.label) return match.label;
    const trackLabel = stream?.getAudioTracks()[0]?.label;
    return trackLabel?.trim() || "Default microphone";
  }, [audioDevices, activeAudioDeviceId, stream]);

  const showCameraControls = capture.mode === "camera" || capture.mode === "screen";
  const cameraTitle = capture.mode === "screen" ? "Bubble camera" : "Camera";

  const selectMic = (id: string) => {
    const next = writeJournalVideoCaptureSettings({ audioDeviceId: id });
    capture.patchSettings(next);
    void capture.selectAudioDevice(id);
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-black/60 px-6 py-8 text-center text-white backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
        <Mic className="h-6 w-6" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1.5">
        <p className="text-lg font-semibold">Set up your camera &amp; mic</p>
        <p className="text-sm text-white/80">
          Pick your devices, say <span className="font-medium text-white">&ldquo;test, test&rdquo;</span>{" "}
          and watch the bars move. Recording starts when you tap below.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        {showCameraControls ? (
          <DeviceRow icon={<Camera className="h-4 w-4" aria-hidden />} label={cameraTitle}>
            {isMobile ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 w-full justify-between gap-2 rounded-lg"
                onClick={() => void capture.switchFacing()}
              >
                <span className="truncate">Flip camera</span>
                <FlipHorizontal className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </Button>
            ) : (
              <DeviceDropdown
                triggerLabel={activeCameraLabel}
                menuLabel="Camera"
                value={activeVideoDeviceId}
                devices={videoDevices}
                fallbackPrefix="Camera"
                onSelect={(id) => void capture.selectDevice(id)}
                emptyLabel="Detecting cameras…"
              />
            )}
          </DeviceRow>
        ) : null}

        <DeviceRow icon={<Mic className="h-4 w-4" aria-hidden />} label="Microphone">
          <DeviceDropdown
            triggerLabel={activeMicLabel}
            menuLabel="Microphone"
            value={activeAudioDeviceId}
            devices={audioDevices}
            fallbackPrefix="Microphone"
            onSelect={selectMic}
            emptyLabel="Detecting microphones…"
          />
        </DeviceRow>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <JournalVideoLiveMicWaveform
          stream={stream}
          active
          className="h-6 gap-1 [&_span]:w-1.5"
          maxBarHeight={22}
        />
        <p className="text-xs text-white/70">Moving bars mean your mic is working</p>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full px-6"
        onClick={onContinue}
      >
        Looks good — continue
      </Button>
    </div>
  );
}

function DeviceRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-left">
      <span className="flex items-center gap-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-white/60">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function DeviceDropdown({
  triggerLabel,
  menuLabel,
  value,
  devices,
  fallbackPrefix,
  onSelect,
  emptyLabel,
}: {
  triggerLabel: string;
  menuLabel: string;
  value: string;
  devices: MediaDeviceInfo[];
  fallbackPrefix: string;
  onSelect: (deviceId: string) => void;
  emptyLabel: string;
}) {
  const hasDevices = devices.length > 0;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasDevices}
          className="h-9 w-full justify-between gap-2 rounded-lg"
        >
          <span className="truncate">{hasDevices ? triggerLabel : emptyLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("max-h-[min(50vh,20rem)] w-[min(20rem,80vw)] overflow-y-auto", OVERLAY_MENU_Z)}
      >
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onSelect}>
          {devices.map((d) => (
            <DropdownMenuRadioItem key={d.deviceId} value={d.deviceId}>
              {deviceLabel(d, `${fallbackPrefix} ${d.deviceId.slice(0, 6)}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

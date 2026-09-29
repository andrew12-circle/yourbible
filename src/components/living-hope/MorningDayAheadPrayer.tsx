import { MorningPrayerReader } from "./MorningPrayerReader";
import {
  DAY_AHEAD_PRAYER_INTRO,
  DAY_AHEAD_PRAYER_TITLE,
  DEFAULT_DAY_AHEAD_PRAYER,
} from "@/lib/livingHope/dayAheadPrayer";

type Props = {
  value?: string;
  onChange: (value: string) => void;
  recordingPath?: string;
  onRecordingPathChange: (path: string) => void;
};

export function MorningDayAheadPrayer({ value, onChange, recordingPath, onRecordingPathChange }: Props) {
  return (
    <div className="space-y-5 border-b border-border/50 pb-7">
      <header className="space-y-2">
        <h2 className="font-serif text-2xl leading-tight sm:text-3xl">{DAY_AHEAD_PRAYER_TITLE}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{DAY_AHEAD_PRAYER_INTRO}</p>
      </header>
      <MorningPrayerReader
        title={DAY_AHEAD_PRAYER_TITLE}
        value={value ?? DEFAULT_DAY_AHEAD_PRAYER}
        onChange={onChange}
        prayerKey="day_ahead"
        recordingPath={recordingPath}
        onRecordingPathChange={onRecordingPathChange}
      />
    </div>
  );
}

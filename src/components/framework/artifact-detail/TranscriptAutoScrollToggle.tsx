import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  id?: string;
  className?: string;
};

export default function TranscriptAutoScrollToggle({
  enabled,
  onChange,
  id = "transcript-auto-scroll",
  className,
}: Props) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-foreground">
        Auto-scroll
      </label>
      <Switch
        id={id}
        checked={enabled}
        onCheckedChange={onChange}
        aria-label="Auto-scroll transcript with video playback"
      />
    </div>
  );
}

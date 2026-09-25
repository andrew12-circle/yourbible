import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";

type Props = {
  answeredAt: string;
  amountProvided: string;
  answerText: string;
  provisionSource?: string;
  onAnsweredAtChange: (value: string) => void;
  onAmountProvidedChange: (value: string) => void;
  onAnswerTextChange: (value: string) => void;
  onProvisionSourceChange?: (value: string) => void;
  disabled?: boolean;
  storyRequired?: boolean;
};

export default function PrayerAnswerFieldsSection({
  answeredAt,
  amountProvided,
  answerText,
  provisionSource = "",
  onAnsweredAtChange,
  onAmountProvidedChange,
  onAnswerTextChange,
  onProvisionSourceChange,
  disabled = false,
  storyRequired = false,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provision-answered-date">Date answered</Label>
        <Input
          id="provision-answered-date"
          type="date"
          value={answeredAt}
          onChange={(e) => onAnsweredAtChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="provision-amount-received">Amount received</Label>
        <Input
          id="provision-amount-received"
          value={amountProvided}
          onChange={(e) => onAmountProvidedChange(e.target.value)}
          placeholder="$4,200"
          inputMode="decimal"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">Shows in the ledger Received column.</p>
      </div>

      {onProvisionSourceChange ? (
        <div className="space-y-2">
          <Label htmlFor="provision-source-received">Provision source</Label>
          <Input
            id="provision-source-received"
            value={provisionSource}
            onChange={(e) => onProvisionSourceChange(e.target.value)}
            placeholder="Commission from the Smith closing"
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Record where the provision actually came from. An expected source can be noted before it arrives.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="provision-story">
          Story — how did God provide?{storyRequired ? "" : " (optional)"}
        </Label>
        <PolishedTextarea
          id="provision-story"
          value={answerText}
          onChange={(e) => onAnswerTextChange(e.target.value)}
          placeholder="Closed three unexpected loans that fully covered payroll."
          className="min-h-[100px] resize-none"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">Shows in the ledger Story column — not Notes.</p>
      </div>
    </div>
  );
}

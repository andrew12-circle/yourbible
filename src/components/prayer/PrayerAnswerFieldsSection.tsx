import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";

type Props = {
  answeredAt: string;
  amountProvided: string;
  answerText: string;
  onAnsweredAtChange: (value: string) => void;
  onAmountProvidedChange: (value: string) => void;
  onAnswerTextChange: (value: string) => void;
  disabled?: boolean;
  storyRequired?: boolean;
};

export default function PrayerAnswerFieldsSection({
  answeredAt,
  amountProvided,
  answerText,
  onAnsweredAtChange,
  onAmountProvidedChange,
  onAnswerTextChange,
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

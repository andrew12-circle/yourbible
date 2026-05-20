import { FileText, RefreshCw, Sparkles } from "lucide-react";
import ClaimIconActionButton from "@/components/framework/ClaimIconActionButton";

type Props = {
  showPaste: boolean;
  showWrapUp: boolean;
  showReanalyze: boolean;
  onPaste: () => void;
  onWrapUp: () => void;
  onReanalyze: () => void;
};

export default function ArtifactHeaderActions({
  showPaste,
  showWrapUp,
  showReanalyze,
  onPaste,
  onWrapUp,
  onReanalyze,
}: Props) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      {showPaste ? (
        <ClaimIconActionButton label="Paste transcript" icon={FileText} tone="reflect" onClick={onPaste} />
      ) : null}
      {showWrapUp ? (
        <ClaimIconActionButton label="Wrap up" icon={Sparkles} tone="research" active onClick={onWrapUp} />
      ) : null}
      {showReanalyze ? (
        <ClaimIconActionButton label="Re-analyze" icon={RefreshCw} tone="defer" onClick={onReanalyze} />
      ) : null}
    </div>
  );
}

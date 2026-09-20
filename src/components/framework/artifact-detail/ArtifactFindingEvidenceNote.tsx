import type { ArtifactFindingEvidence } from "@/lib/framework/artifactFindingEvidence";

export default function ArtifactFindingEvidenceNote({ finding, linked }: { finding: ArtifactFindingEvidence; linked: boolean }) {
  return (
    <div className="my-3 space-y-1 text-xs leading-relaxed" data-testid="finding-evidence-note">
      <p className="font-medium">
        {linked ? finding.source_timing_kind === "measured" ? "Source linked · caption timestamp" : "Source linked · approximate or unavailable timing"
          : "Source not verified · older finding or changed transcript"}
      </p>
      {finding.importance_reason ? <p><span className="font-medium">Why selected: </span>{finding.importance_reason}</p> : null}
      <p className="opacity-70">A source link shows what was said, not whether the claim is true. Your conclusion remains yours.</p>
    </div>
  );
}

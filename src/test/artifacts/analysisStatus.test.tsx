import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ArtifactAnalysisStatus from "@/components/framework/artifact-detail/ArtifactAnalysisStatus";
const artifact = { id: "a", title: "Source", kind: "youtube", status: "error", error: "Provider quota unavailable", raw_text: "Transcript", metadata: { analysis_v2: { state: "partial", phase: "extract", completed_sections: 4, total_sections: 18 } } };
afterEach(cleanup);
describe("honest analysis state", () => {
  it("does not call partial work ready", () => {
    render(<ArtifactAnalysisStatus artifact={artifact} findingsCount={10} onResume={vi.fn()} />);
    expect(screen.getByText("Analysis incomplete")).toBeInTheDocument();
    expect(screen.getByText(/4 of 18 sections processed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resume unfinished/ })).toBeInTheDocument();
    expect(screen.getByText(/previous findings and research remain/)).toBeInTheDocument();
  });
  it("distinguishes completed empty analysis", () => {
    render(<ArtifactAnalysisStatus artifact={{ ...artifact, error: null, metadata: { analysis_v2: { state: "complete", phase: "complete", completed_sections: 18, total_sections: 18 } } }} findingsCount={0} onResume={vi.fn()} />);
    expect(screen.getByText("Analysis complete · no substantive findings")).toBeInTheDocument();
  });
});

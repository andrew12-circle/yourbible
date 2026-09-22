import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MorningRitualStepNav } from "./MorningRitualStepNav";
import { MorningSessionFooter } from "./MorningSessionFooter";
import { ThanksgivingListsInput } from "./ThanksgivingListsInput";
import { MorningFormulaSessionTimer } from "./MorningFormulaSessionTimer";
import { buildExpressRitualSteps } from "@/lib/livingHope/morningRitual";
vi.mock("./MorningThanksgivingVoice", () => ({ MorningThanksgivingVoice: ({ group }: { group: string }) => <p>Voice group: {group}</p> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "session-test" }, profile: { user_id: "session-test", journal_e2e_enabled: false } }) }));
afterEach(cleanup);
const steps = buildExpressRitualSteps();

describe("One consistent session interface", () => {
  it("exposes native, keyboard-operable step navigation with no done shortcut", () => {
    const change = vi.fn();
    const { container } = render(<MorningRitualStepNav steps={steps} stepIndex={2} goalTotal={0} onStepIndexChange={change} />);
    fireEvent.click(screen.getByText("All steps"));
    container.querySelector("details")!.open = true;
    expect(screen.getByText("Step 2 of 5")).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("button", { name: "Scripture" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Worship" }));
    expect(change).toHaveBeenCalledWith(1);
    expect(container.querySelector("details")!.open).toBe(false);
  });
  it("uses explicit destination labels and blocks duplicate navigation during saves", () => {
    const next = vi.fn();
    const props = { steps, stepIndex: 2, saving: false, onBack: vi.fn(), onContinue: next };
    const { rerender } = render(<MorningSessionFooter {...props} />);
    fireEvent.click(screen.getByRole("button", { name: /Continue to Scripture/ }));
    expect(next).toHaveBeenCalledOnce();
    rerender(<MorningSessionFooter {...props} saving />);
    expect(screen.getByRole("button", { name: /Saving your morning/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Back/ })).toBeDisabled();
  });
  it("keeps the current step countdown visible and respects expired and hidden states", () => {
    const props = { durationMin: 30 as const, onDurationChange: vi.fn(), stepRemainingMs: 80_000, sessionRemainingMs: 480_000, stepExpired: false, visible: true };
    const { rerender } = render(<MorningFormulaSessionTimer {...props} />);
    expect(screen.getByRole("button", { name: "Step pace: 1:20 remaining" })).toHaveTextContent("1:20");
    expect(screen.queryByText("Session pace")).toBeNull();
    rerender(<MorningFormulaSessionTimer {...props} stepRemainingMs={0} stepExpired />);
    expect(screen.getByRole("button", { name: "Step pace: 0:00 remaining" })).toHaveTextContent("Ready");
    rerender(<MorningFormulaSessionTimer {...props} visible={false} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("keeps both gratitude groups when switching and never requires five answers", () => {
    function Harness() {
      const [now, setNow] = useState(["My family", "", "", "", ""]);
      const [future, setFuture] = useState(["", "", "", "", ""]);
      return <ThanksgivingListsInput thanksgivingNow={now} thanksgivingNotYet={future}
        onThanksgivingNowChange={(index, value) => setNow((v) => v.map((old, i) => i === index ? value : old))}
        onThanksgivingNotYetChange={(index, value) => setFuture((v) => v.map((old, i) => i === index ? value : old))} />;
    }
    render(<TooltipProvider><Harness /></TooltipProvider>);
    expect(screen.getAllByRole("textbox")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Reflect on what's ahead" }));
    expect(screen.getByText("Voice group: not-yet")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Thankful for what's ahead 1"), { target: { value: "Wisdom" } });
    fireEvent.click(screen.getByRole("button", { name: /Thankful today/ }));
    expect(screen.getByLabelText("Thankful today 1")).toHaveValue("My family");
    fireEvent.click(screen.getByRole("button", { name: /Thankful for what's ahead/ }));
    expect(screen.getByLabelText("Thankful for what's ahead 1")).toHaveValue("Wisdom");
  });
});

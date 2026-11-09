import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { BeStillExperience } from "./BeStillExperience";
import { createBeStillSession, type BeStillEntryPoint, type BeStillSession } from "@/lib/prayer/beStill";
import { MORNING_FORMULA_CONVERSATION_RETURN } from "@/lib/bible/readerNavigation";

const controls = {
  initialSession: null as BeStillSession | null,
  failSave: false,
  complete: vi.fn(),
  retry: vi.fn(),
};

/** Exercise the real controls while persistence and time remain owned by their hook tests. */
function useMockBeStillSession(_userId: string, entryPoint: BeStillEntryPoint) {
  const [session, setSession] = useState<BeStillSession | null>(() => controls.initialSession);
  const [error, setError] = useState<string | null>(null);
  const complete = async () => {
    controls.complete(session);
    if (controls.failSave) {
      setError("Could not save your reflection. Your draft is kept.");
      return;
    }
    setError(null);
    setSession((current) => current ? { ...current, completedAt: "2026-11-09T15:00:00.000Z" } : current);
  };
  return {
    session,
    loading: false,
    busy: false,
    error,
    completed: Boolean(session?.completedAt),
    draftStatus: "saved" as const,
    start: async () => { setSession(createBeStillSession(entryPoint)); },
    update: (patch: Partial<BeStillSession>) => { setSession((current) => current ? { ...current, ...patch } : current); },
    complete,
    retry: async () => { controls.retry(); await complete(); },
  };
}

vi.mock("@/hooks/useBeStillSession", () => ({
  useBeStillSession: (userId: string, entryPoint: BeStillEntryPoint) => useMockBeStillSession(userId, entryPoint),
}));
vi.mock("@/components/prayer/QuietPrayerTimer", () => ({
  QuietPrayerTimer: ({ title }: { title: string }) => <div role="timer" aria-label={title}>Quiet time</div>,
}));

function renderExperience(entryPoint: BeStillEntryPoint = "prayer") {
  return render(<MemoryRouter><BeStillExperience userId="prayer-user" entryPoint={entryPoint} /></MemoryRouter>);
}

function continueWith(label: string) {
  const button = screen.getAllByRole("button", { name: label }).find((candidate) => !candidate.closest("nav"));
  expect(button).toBeDefined();
  fireEvent.click(button!);
}

beforeEach(() => {
  controls.initialSession = null;
  controls.failSave = false;
  controls.complete.mockClear();
  controls.retry.mockClear();
});
afterEach(cleanup);

describe("Be Still guided prayer", () => {
  it("moves through all four stages and saves a quiet session without requiring a written answer", async () => {
    renderExperience("morning");
    fireEvent.click(screen.getByRole("button", { name: "Begin a quiet session" }));
    expect(screen.getByRole("heading", { name: "Prepare to receive." })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Begin stillness" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Write one question before sitting" }), { target: { value: "What matters today?" } });
    fireEvent.change(screen.getByRole("textbox", { name: "My quiet place" }), { target: { value: "My prayer chair" } });
    fireEvent.change(screen.getByLabelText("My regular hour"), { target: { value: "07:00" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /ready to set everything out of my hands/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /nothing is waiting to interrupt me/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /put away the hurry/ }));
    continueWith("Begin stillness");
    const stages = screen.getByRole("navigation", { name: "Listening prayer stages" });
    expect(within(stages).getAllByRole("button")).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "Become still." })).toHaveFocus();
    expect(screen.getByRole("timer", { name: "Put the day away" })).toBeInTheDocument();

    continueWith("Bring my question");
    expect(screen.getByRole("heading", { name: "One question." })).toHaveFocus();
    expect(screen.getByText("What matters today?")).toBeInTheDocument();
    continueWith("See it clearly");
    expect(screen.getByRole("heading", { name: "See the question." })).toBeInTheDocument();
    continueWith("Release and listen");
    expect(screen.getByRole("timer", { name: "Wait without forcing" })).toBeInTheDocument();
    continueWith("Reflect when ready");

    expect(screen.getByRole("textbox", { name: "What came to mind?" })).toHaveValue("");
    fireEvent.click(screen.getByRole("radio", { name: /Nothing clear today/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save my reflection" }));

    expect(await screen.findByRole("heading", { name: "Your time in prayer is saved." })).toHaveFocus();
    const savedSession = controls.complete.mock.calls[0][0] as BeStillSession;
    expect(savedSession).toMatchObject({ question: "What matters today?", place: "My prayer chair", hour: "07:00", picture: "", reflection: "", outcome: "nothing-clear", thoughtOrigin: "none" });
    expect(screen.getByRole("link", { name: "Open in Journal" })).toHaveAttribute("href", `/journal/${savedSession.id}`);
    expect(screen.getByRole("link", { name: "Return to Morning Formula" })).toHaveAttribute("href", MORNING_FORMULA_CONVERSATION_RETURN);
  });

  it("keeps the written question and mental picture when moving backward", () => {
    controls.initialSession = { ...createBeStillSession("prayer"), stage: "picture", question: "How can I repair this friendship?" };
    renderExperience();
    fireEvent.change(screen.getByRole("textbox", { name: "Describe what you pictured (optional)" }),
      { target: { value: "A conversation at the kitchen table." } });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("How can I repair this friendship?")).toBeInTheDocument();
    continueWith("See it clearly");
    expect(screen.getByRole("textbox", { name: "Describe what you pictured (optional)" }))
      .toHaveValue("A conversation at the kitchen table.");
  });

  it("requires writing the question before sitting, not during the stillness step", () => {
    controls.initialSession = createBeStillSession("prayer");
    renderExperience();
    expect(screen.getByRole("button", { name: "Begin stillness" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Write one question before sitting" }),
      { target: { value: "One question. A second?" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Write one question in a single sentence");
    expect(screen.getByRole("button", { name: "Begin stillness" })).toBeDisabled();
  });

  it("records an arriving thought's characteristics without treating them as a proven answer", () => {
    controls.initialSession = { ...createBeStillSession("prayer"), stage: "reflect" };
    renderExperience();
    fireEvent.click(screen.getByRole("radio", { name: /A thought that arrived whole/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /came calmly/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /asked something of me/ }));
    expect(screen.getByRole("checkbox", { name: /came calmly/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /asked something of me/ })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: /A thought I built/ }));
    expect(screen.queryByRole("checkbox", { name: /came calmly/ })).not.toBeInTheDocument();
  });

  it("shows a failed save without losing reflection text, and wires retry to the same session", async () => {
    controls.initialSession = { ...createBeStillSession("prayer"), stage: "reflect", reflection: "Make time to call and listen." };
    controls.failSave = true;
    renderExperience();
    fireEvent.click(screen.getByRole("button", { name: "Save my reflection" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save your reflection");
    expect(screen.getByRole("textbox", { name: "What came to mind?" })).toHaveValue("Make time to call and listen.");
    expect(screen.queryByRole("heading", { name: "Your time in prayer is saved." })).not.toBeInTheDocument();

    controls.failSave = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Your time in prayer is saved." })).toBeInTheDocument();
    expect(controls.retry).toHaveBeenCalledOnce();
    expect(controls.complete).toHaveBeenCalledTimes(2);
    expect(controls.complete.mock.calls.map(([session]) => session.id)).toEqual([controls.initialSession.id, controls.initialSession.id]);
    expect(screen.getByRole("link", { name: "Return to Prayer" })).toHaveAttribute("href", "/prayer");
  });

  it("uses a resumed session's Morning Formula origin for its completed return link", () => {
    controls.initialSession = { ...createBeStillSession("morning"), stage: "reflect", completedAt: "2026-11-09T15:00:00.000Z" };
    renderExperience("prayer");
    expect(screen.getByRole("link", { name: "Return to Morning Formula" })).toHaveAttribute("href", MORNING_FORMULA_CONVERSATION_RETURN);
    expect(screen.queryByRole("link", { name: "Return to Prayer" })).not.toBeInTheDocument();
  });

  it("updates the recovery URL when starting another session so reload resumes the new one", async () => {
    const previous = { ...createBeStillSession("morning"), stage: "reflect" as const, completedAt: "2026-11-09T15:00:00.000Z" };
    controls.initialSession = previous;
    function LocationProbe() {
      return <output aria-label="Current route">{useLocation().search}</output>;
    }
    render(<MemoryRouter initialEntries={[`/prayer/be-still?session=${previous.id}`]}>
      <BeStillExperience userId="prayer-user" entryPoint="morning" resumeId={previous.id} />
      <LocationProbe />
    </MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Begin another session" }));
    expect(await screen.findByRole("heading", { name: "Prepare to receive." })).toBeInTheDocument();
    const search = new URLSearchParams(screen.getByLabelText("Current route").textContent ?? "");
    expect(search.get("session")).toBeTruthy();
    expect(search.get("session")).not.toBe(previous.id);
    expect(search.get("from")).toBe("morning");
  });
});

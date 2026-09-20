import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import ArtifactFindingHistory from "@/components/framework/artifact-detail/ArtifactFindingHistory";

const mocks = vi.hoisted(() => ({ from: vi.fn(), range: vi.fn(), eq: vi.fn(), not: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext(undefined) };
});
vi.mock("react-router-dom", () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }));

const row = { id: "finding-1", claim: "An earlier interpretation.", verdict: "keep", user_note: "My saved research.", source_quote: "The speaker describes patience." };
const view = (userId: string | null = "owner-1", artifactId = "artifact-1") => (
  <AuthContext.Provider value={{ user: userId ? { id: userId } : null } as AuthContextValue}>
    <ArtifactFindingHistory artifactId={artifactId} />
  </AuthContext.Provider>
);
function openHistory() {
  const element = screen.getByText("Earlier findings and saved research").closest("details")!;
  element.open = true;
  fireEvent(element, new Event("toggle"));
}

beforeEach(() => {
  vi.clearAllMocks();
  const query = { select: () => query, eq: mocks.eq, not: mocks.not, order: () => query, range: mocks.range };
  mocks.from.mockReturnValue(query);
  mocks.eq.mockReturnValue(query);
  mocks.not.mockReturnValue(query);
  mocks.range.mockReset().mockResolvedValue({ data: [row], error: null });
});
afterEach(cleanup);

describe("archived finding history", () => {
  it("does not fetch until expanded and retains research links and notes", async () => {
    const rendered = render(view());
    expect(mocks.from).not.toHaveBeenCalled();
    openHistory();
    expect(await screen.findByText(row.user_note)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open saved research" })).toHaveAttribute("href", "/framework/artifacts/artifact-1/research/finding-1");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "owner-1");
    expect(mocks.eq).toHaveBeenCalledWith("artifact_id", "artifact-1");
    expect(mocks.not).toHaveBeenCalledWith("retired_at", "is", null);
    rendered.rerender(view());
    expect(mocks.range).toHaveBeenCalledTimes(1);
  });
  it("does not show private history or fetch when signed out", () => {
    render(view(null));
    expect(screen.queryByText("Earlier findings and saved research")).not.toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("offers a working retry after a rejected network request", async () => {
    mocks.range.mockRejectedValueOnce(new Error("Network unavailable"));
    render(view());
    openHistory();
    expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(row.user_note)).toBeInTheDocument();
    expect(mocks.range).toHaveBeenCalledTimes(2);
  });
  it("ignores an old account's response after an identity change", async () => {
    let resolveOld!: (result: unknown) => void;
    mocks.range.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    const rendered = render(view("owner-1"));
    openHistory();
    await waitFor(() => expect(mocks.range).toHaveBeenCalledTimes(1));
    rendered.rerender(view("owner-2", "artifact-2"));
    expect(screen.queryByText(row.user_note)).not.toBeInTheDocument();
    await act(async () => { resolveOld({ data: [row], error: null }); });
    expect(screen.queryByText(row.user_note)).not.toBeInTheDocument();
    expect(mocks.range).toHaveBeenCalledTimes(1);
  });
});

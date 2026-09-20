import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrayerShell from "./PrayerShell";

const shellMode = vi.hoisted(() => ({ showHubShell: false }));

vi.mock("@/hooks/useAppShellMode", () => ({
  useAppShellMode: () => shellMode,
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: (props: React.ComponentProps<"button">) => <button type="button" {...props} />,
}));

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PrayerShell>Prayer content</PrayerShell>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  shellMode.showHubShell = false;
});

describe("PrayerShell", () => {
  it.each(["/prayer", "/prayer/requests"])("uses home navigation on standalone Requests at %s", (path) => {
    renderShell(path);
    expect(screen.getByLabelText("Back home")).toHaveAttribute("href", "/home");
    expect(screen.queryByLabelText("Back to prayer")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["/prayer", "/prayer/requests"])("uses the hub navigation trigger on Requests at %s", (path) => {
    shellMode.showHubShell = true;
    renderShell(path);
    expect(screen.getByLabelText("Open navigation")).toBeInTheDocument();
    expect(screen.queryByLabelText("Back home")).not.toBeInTheDocument();
  });

  it("puts Requests first and keeps Overview available as an explicit secondary view", () => {
    renderShell("/prayer?view=overview");
    const nav = screen.getByRole("navigation", { name: "Prayer sections" });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Requests", "Overview", "Praise", "Timeline",
    ]);
    expect(screen.getByLabelText("Back to prayer")).toHaveAttribute("href", "/prayer");
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/prayer");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/prayer?view=overview");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Praise" })).toHaveAttribute("href", "/prayer/praise");
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute("href", "/prayer/timeline");
  });

  it.each([
    "/prayer/requests/new",
    "/prayer/requests/request-1",
    "/prayer/requests/request-1/celebrate",
  ])("keeps %s under Requests with a way back to the ledger", (path) => {
    renderShell(path);
    expect(screen.getByLabelText("Back to prayer")).toHaveAttribute("href", "/prayer");
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["/prayer/praise", "Praise"],
    ["/prayer/timeline", "Timeline"],
  ])("activates only the correct section for %s", (path, label) => {
    renderShell(path);
    expect(screen.getAllByRole("link", { current: "page" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
  });

  it("updates selection and navigation when moving between Requests and Overview", () => {
    renderShell("/prayer?status=waiting");
    fireEvent.click(screen.getByRole("link", { name: "Overview" }));
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Back to prayer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Requests" }));
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("Back home")).toBeInTheDocument();
  });
});

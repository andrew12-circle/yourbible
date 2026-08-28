import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrayerShell from "./PrayerShell";

const shellMode = vi.hoisted(() => ({ showHubShell: false }));

vi.mock("@/hooks/useAppShellMode", () => ({
  useAppShellMode: () => shellMode,
}));

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

describe("PrayerShell", () => {
  it("uses home navigation on the standalone prayer overview instead of linking the back control to itself", () => {
    shellMode.showHubShell = false;
    renderShell("/prayer");

    expect(screen.getByLabelText("Back home")).toHaveAttribute("href", "/home");
    expect(screen.queryByLabelText("Back to prayer")).not.toBeInTheDocument();
  });

  it("uses the hub navigation trigger at the hub prayer overview", () => {
    shellMode.showHubShell = true;
    renderShell("/prayer");

    expect(screen.getByLabelText("Open navigation")).toBeInTheDocument();
    expect(screen.queryByLabelText("Back home")).not.toBeInTheDocument();
  });

  it("keeps child routes navigable back to the prayer overview and exposes all sections", () => {
    shellMode.showHubShell = false;
    renderShell("/prayer/requests");

    expect(screen.getByLabelText("Back to prayer")).toHaveAttribute("href", "/prayer");
    expect(screen.getByRole("navigation", { name: "Prayer sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/prayer");
    expect(screen.getByRole("link", { name: "Requests" })).toHaveAttribute("href", "/prayer/requests");
    expect(screen.getByRole("link", { name: "Praise" })).toHaveAttribute("href", "/prayer/praise");
    expect(screen.getByRole("link", { name: "Timeline" })).toHaveAttribute("href", "/prayer/timeline");
  });
});

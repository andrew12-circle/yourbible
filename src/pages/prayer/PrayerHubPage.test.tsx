import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import PrayerHubPage from "./PrayerHubPage";

const overviewRequests = vi.hoisted(() => vi.fn(() => ({ rows: [], loading: false })));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user" }, loading: false }),
}));
vi.mock("@/hooks/usePrayerRequests", () => ({
  usePrayerRequests: overviewRequests,
}));
vi.mock("@/hooks/usePrayerStats", () => ({ usePrayerStats: () => ({}) }));
vi.mock("@/components/prayer/PrayerStatsPanel", () => ({ default: () => <div>Prayer totals</div> }));
vi.mock("@/components/prayer/PrayerShell", () => ({
  default: ({ children, title }: { children: ReactNode; title: string }) => (
    <main><h1>{title}</h1>{children}</main>
  ),
}));
vi.mock("@/pages/prayer/PrayerRequestsListPage", () => ({
  default: () => <div data-testid="requests-ledger">Requests ledger</div>,
}));

function NavigationControls() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <button onClick={() => navigate("/prayer?view=overview")}>Show overview</button>
      <button onClick={() => navigate(-1)}>History back</button>
      <output data-testid="location">{location.pathname}{location.search}</output>
    </>
  );
}

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationControls />
      <PrayerHubPage />
    </MemoryRouter>,
  );
}

beforeEach(() => overviewRequests.mockClear());

describe("Prayer landing page", () => {
  it.each(["/prayer", "/prayer/", "/prayer?status=waiting", "/prayer?view=unknown"])(
    "renders the existing ledger directly at %s without fetching Overview",
    (path) => {
      renderPage(path);
      expect(screen.getByTestId("requests-ledger")).toBeInTheDocument();
      expect(screen.getByTestId("location").textContent).toBe(path);
      expect(screen.queryByRole("heading", { name: "Prayer overview" })).not.toBeInTheDocument();
      expect(overviewRequests).not.toHaveBeenCalled();
    },
  );

  it("shows Overview only when selected explicitly", () => {
    renderPage("/prayer?view=overview");
    expect(screen.getByRole("heading", { name: "Prayer overview" })).toBeInTheDocument();
    expect(screen.queryByTestId("requests-ledger")).not.toBeInTheDocument();
    expect(overviewRequests).toHaveBeenCalledWith("test-user", { status: "all" });
    expect(screen.getByRole("link", { name: "View requests" })).toHaveAttribute("href", "/prayer");
  });

  it("switches to Overview and returns to Requests through browser history", () => {
    renderPage("/prayer");
    fireEvent.click(screen.getByRole("button", { name: "Show overview" }));
    expect(screen.getByRole("heading", { name: "Prayer overview" })).toBeInTheDocument();
    expect(screen.queryByTestId("requests-ledger")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByTestId("requests-ledger")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Prayer overview" })).not.toBeInTheDocument();
  });
});

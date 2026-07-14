import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { PwaResumeManager } from "@/components/PwaResumeManager";
import {
  createPwaResumeSnapshot,
  PWA_RESUME_STORAGE_KEY,
  savePwaResumeSnapshot,
} from "@/lib/pwaResume";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>;
}

describe("PwaResumeManager", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          matches: query === "(display-mode: standalone)",
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(performance.now());
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores the last safe standalone PWA route from the launch URL", async () => {
    expect(
      savePwaResumeSnapshot(
        localStorage,
        createPwaResumeSnapshot("/journal/e/entry-1?tab=chat#reply", 0, 240),
      ),
    ).toBe(true);
    expect(localStorage.getItem(PWA_RESUME_STORAGE_KEY)).toContain("/journal/e/entry-1");
    expect(window.matchMedia("(display-mode: standalone)").matches).toBe(true);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <PwaResumeManager />
        <LocationProbe />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/journal/e/entry-1?tab=chat#reply");
    });
    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith(0, 240);
    });
  });

  it("keeps normal browser launches on the requested URL", () => {
    vi.mocked(window.matchMedia).mockImplementation(
      (query) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    savePwaResumeSnapshot(localStorage, createPwaResumeSnapshot("/home", 0, 0));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <PwaResumeManager />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("location")).toHaveTextContent("/");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

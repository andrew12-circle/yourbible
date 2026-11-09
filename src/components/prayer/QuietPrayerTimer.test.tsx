import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuietPrayerTimer } from "./QuietPrayerTimer";

describe("QuietPrayerTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T15:00:00Z"));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps completion gentle and leaves reflection to the user", () => {
    const onReflect = vi.fn();
    render(<QuietPrayerTimer initialMinutes={2} onReflect={onReflect} />);
    expect(screen.getByRole("button", { name: "End tone off" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");
    fireEvent.click(screen.getByRole("button", { name: "Begin quiet time" }));
    act(() => vi.advanceTimersByTime(120_000));
    expect(screen.getByText("Your quiet time is complete. Stay as long as you like.")).toBeInTheDocument();
    expect(onReflect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reflect" }));
    expect(onReflect).toHaveBeenCalledTimes(1);
  });

  it("hides the changing time while retaining pause and open-ended controls", () => {
    render(<QuietPrayerTimer />);
    fireEvent.click(screen.getByRole("button", { name: "Open-ended" }));
    expect(screen.getByText("No time limit")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Begin quiet time" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide timer" }));
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("Be still")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });
});

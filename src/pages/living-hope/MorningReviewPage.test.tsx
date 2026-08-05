import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MorningReviewPage from "@/pages/living-hope/MorningReviewPage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "mobile-test@example.local" },
    profile: { display_name: "Mobile Tester" },
    loading: false,
  }),
}));

vi.mock("@/hooks/useLivingHope", () => ({
  useLivingHope: () => ({
    busy: false,
    goals: [],
    letter: null,
    load: vi.fn(),
    setTodayReview: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLivingHopeWorkbook", () => ({
  useLivingHopeWorkbook: () => ({
    busy: false,
    workbook: null,
    update: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMorningScripture", () => ({
  useMorningScripture: () => ({
    scripture: null,
    busy: false,
    error: null,
    generateDaily: vi.fn(),
    ensureScripture: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMorningConversationEntry", () => ({
  useMorningConversationEntry: () => ({
    entryId: null,
    preview: null,
    busy: false,
    error: null,
    ensureEntry: vi.fn(),
    refreshPreview: vi.fn(),
    syncThanksgiving: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMorningFormulaTimer", () => ({
  useMorningFormulaTimer: () => ({
    durationMin: 15,
    setDurationMin: vi.fn(),
    showTimer: false,
    stepRemainingMs: 0,
    sessionRemainingMs: 0,
    stepExpired: false,
    stepBudgetMs: 0,
  }),
}));

describe("MorningReviewPage", () => {
  it("renders the structured morning formula route without crashing", () => {
    render(
      <MemoryRouter initialEntries={["/living-hope/review?mode=structured"]}>
        <Routes>
          <Route path="/living-hope/review" element={<MorningReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Morning formula" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guided morning/ })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PrayerLedgerTable from "@/components/prayer/PrayerLedgerTable";
import type { PrayerRequestRow } from "@/lib/prayer/types";

const baseRow: PrayerRequestRow = {
  id: "request-1",
  user_id: "user-1",
  title: "Rent",
  prayer_text: "Please provide rent",
  purpose: "Keep the family housed this month",
  category: "finances",
  status: "waiting",
  requested_at: "2026-07-01",
  deadline: "2026-07-31",
  answered_at: null,
  amount_requested: 1400,
  amount_provided: null,
  answer_text: null,
  private_notes: "",
  scripture_refs: [{ ref: "Matthew 6:33" }],
  praise_report_entry_id: null,
  sort_order: 0,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

describe("PrayerLedgerTable", () => {
  it("renders readable mobile ledger cards with the existing record action", () => {
    const onMarkAnswered = vi.fn();

    render(
      <MemoryRouter>
        <PrayerLedgerTable rows={[baseRow]} onMarkAnswered={onMarkAnswered} />
      </MemoryRouter>,
    );

    const mobileLedger = screen.getByRole("list", { name: /mobile provision ledger/i });
    expect(mobileLedger).toHaveClass("md:hidden");
    expect(within(mobileLedger).getByRole("link", { name: "Rent" })).toHaveAttribute(
      "href",
      "/prayer/requests/request-1",
    );
    expect(within(mobileLedger).getByText("Keep the family housed this month")).toBeInTheDocument();
    expect(within(mobileLedger).getByText("Matthew 6:33")).toBeInTheDocument();

    fireEvent.click(within(mobileLedger).getByRole("button", { name: "Record answer for Rent" }));
    expect(onMarkAnswered).toHaveBeenCalledWith(baseRow);
  });

  it("keeps the desktop ledger wide enough to scroll instead of compressing columns", () => {
    render(
      <MemoryRouter>
        <PrayerLedgerTable rows={[baseRow]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("table")).toHaveClass("min-w-[68rem]");
  });
});

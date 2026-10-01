import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PrayerRequestCard from "./PrayerRequestCard";
import PraiseReportCard from "./PraiseReportCard";
import type { PrayerRequestRow } from "@/lib/prayer/types";

// Prayer requested/answered fields are dates; journal entry and audit fields are timestamps.
const request: PrayerRequestRow = {
  id: "request-1", user_id: "test-user", title: "Family provision",
  prayer_text: "Please provide what our family needs.", purpose: "Cover household needs",
  category: "family", status: "waiting", priority: "important", need_kind: "need",
  consequence: "", provision_source: "", requested_at: "2026-07-02",
  deadline: "2026-07-31", answered_at: null, amount_requested: 2500, amount_provided: null,
  answer_text: null, private_notes: "", scripture_refs: [], praise_report_entry_id: null,
  recurring_template_id: null, occurrence_month: null, sort_order: 0, created_at: "2026-07-02T12:00:00Z", updated_at: "2026-07-02T12:00:00Z",
};
const entry = {
  id: "praise-1", title: "Provision received", body: "We received the help we needed.",
  entry_at_ts: "2026-07-20T12:00:00Z",
};

describe("Prayer cards", () => {
  it("uses a plain request card while preserving status, amount, text and its detail link", () => {
    const { container } = render(<MemoryRouter><PrayerRequestCard request={request} /></MemoryRouter>);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/prayer/requests/request-1");
    expect(screen.getByRole("link")).toHaveClass("bg-card", "border", "rounded-xl");
    expect(screen.getByRole("heading", { name: request.title })).toBeInTheDocument();
    expect(screen.getByText(request.prayer_text)).toBeInTheDocument();
    expect(screen.getByText("$2,500")).toBeInTheDocument();
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/Requested July 2, 2026/)).toBeInTheDocument();
    expect(screen.getByText("View request")).toBeInTheDocument();
    expect(container.querySelector('[class*="prayer-scroll"]')).toBeNull();
    expect(screen.queryByText("Open scroll")).not.toBeInTheDocument();
  });

  it("uses the purpose as a useful preview when prayer text is empty", () => {
    render(<MemoryRouter><PrayerRequestCard request={{ ...request, prayer_text: "  " }} /></MemoryRouter>);
    expect(screen.getByText(request.purpose)).toBeInTheDocument();
  });

  it("still opens requests with no preview or amount", () => {
    render(<MemoryRouter><PrayerRequestCard request={{
      ...request, prayer_text: "", purpose: "", amount_requested: null,
    }} /></MemoryRouter>);
    expect(screen.getByText("View request")).toBeInTheDocument();
    expect(screen.queryByText("$2,500")).not.toBeInTheDocument();
    expect(screen.queryByText("Open scroll")).not.toBeInTheDocument();
  });

  it("uses a plain praise card and retains the journal link, story and answer metadata", () => {
    const { container } = render(
      <MemoryRouter><PraiseReportCard entry={entry} linkedRequest={{
        ...request, status: "answered", answered_at: "2026-07-20", amount_provided: 2500,
      }} /></MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/journal/praise-1");
    expect(screen.getByRole("link")).toHaveClass("bg-card", "border", "rounded-xl");
    expect(screen.getByRole("heading", { name: entry.title })).toBeInTheDocument();
    expect(screen.getByText(entry.body)).toBeInTheDocument();
    expect(screen.getByText(/Waited 18 days/)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(screen.getByText("Read praise report")).toBeInTheDocument();
    expect(container.querySelector('[class*="prayer-scroll"]')).toBeNull();
  });

  it("supports standalone praise reports with empty title and body", () => {
    render(<MemoryRouter><PraiseReportCard entry={{ ...entry, title: null, body: null }} /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Praise report" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/journal/praise-1");
    expect(screen.getByText("Read praise report")).toBeInTheDocument();
  });
});

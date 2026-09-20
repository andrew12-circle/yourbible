import { describe, expect, it } from "vitest";
import { getPrayerSection, isPrayerLanding, PRAYER_TABS } from "./navigation";

describe("Prayer navigation", () => {
  it("lists Requests first", () => {
    expect(PRAYER_TABS.map((tab) => tab.id)).toEqual(["requests", "overview", "praise", "timeline"]);
    expect(PRAYER_TABS[0].to).toBe("/prayer");
  });

  it.each(["", "?status=waiting", "?view=unknown", "?view=", "?month=2026-07"])(
    "defaults the root to Requests for search %s",
    (search) => {
      expect(getPrayerSection("/prayer", search)).toBe("requests");
      expect(isPrayerLanding("/prayer", search)).toBe(true);
    },
  );

  it("requires an explicit Overview selection", () => {
    expect(getPrayerSection("/prayer", "?view=overview")).toBe("overview");
    expect(isPrayerLanding("/prayer", "?view=overview")).toBe(false);
    expect(getPrayerSection("/prayer/", "?status=waiting&view=overview")).toBe("overview");
  });

  it.each([
    "/prayer/requests", "/prayer/requests/", "/prayer/requests/new",
    "/prayer/requests/request-1", "/prayer/requests/request-1/celebrate",
  ])("preserves Requests selection for %s even with unrelated query parameters", (path) => {
    expect(getPrayerSection(path, "?view=overview")).toBe("requests");
  });

  it("recognizes the old ledger URL as a landing page, but not a detail page", () => {
    expect(isPrayerLanding("/prayer/requests")).toBe(true);
    expect(isPrayerLanding("/prayer/requests/new")).toBe(false);
    expect(isPrayerLanding("/prayer/requests/request-1")).toBe(false);
  });

  it("normalizes a trailing slash on the root", () => {
    expect(getPrayerSection("/prayer/")).toBe("requests");
    expect(isPrayerLanding("/prayer/")).toBe(true);
  });

  it.each([
    ["/prayer/praise", "praise"],
    ["/prayer/praise/report-1", "praise"],
    ["/prayer/timeline", "timeline"],
  ])("selects the proper section for %s", (path, expected) => {
    expect(getPrayerSection(path)).toBe(expected);
    expect(isPrayerLanding(path)).toBe(false);
  });

  it.each(["/home", "/prayerful", "/prayer/requests-extra"])("does not partially match %s", (path) => {
    expect(getPrayerSection(path)).toBeNull();
    expect(isPrayerLanding(path)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { JournalViewAdoption } from "./journalViewAdoption";
describe("journal external view adoption", () => {
  it("does not treat the old screen as a user revert before React commits", () => {
    const guard = new JournalViewAdoption();
    const old = { body: "My writing", title: "Prayer" };
    guard.stage(old, { body: "My writing\n\nVideo transcript" });
    expect(guard.consume(old, old).patch).toEqual({});
    expect(guard.consume(old, old).observed).toEqual(old);
  });
  it("acknowledges the displayed transcript without saving it twice", () => {
    const guard = new JournalViewAdoption();
    const old = { body: "Before" };
    guard.stage(old, { body: "After" });
    expect(guard.consume(old, { body: "After" })).toEqual({ observed: { body: "After" }, patch: {} });
    expect(guard.consume({ body: "After" }, { body: "After and typed" }).patch).toEqual({ body: "After and typed" });
  });
  it("retains edits to other fields while a body update is pending", () => {
    const guard = new JournalViewAdoption();
    const old = { body: "Before", title: "Old" };
    guard.stage(old, { body: "After" });
    expect(guard.consume(old, { body: "Before", title: "My new title" }).patch).toEqual({ title: "My new title" });
  });
  it("handles repeated queue notifications before redraw", () => {
    const guard = new JournalViewAdoption();
    const old = { body: "Before" };
    guard.stage(old, { body: "After" });
    guard.stage(old, { body: "After again" });
    expect(guard.consume(old, old).patch).toEqual({});
    expect(guard.consume(old, { body: "After again" }).patch).toEqual({});
  });
  it("clears state on an entry or account switch", () => {
    const guard = new JournalViewAdoption();
    guard.stage({ body: "Before" }, { body: "After" });
    guard.reset();
    expect(guard.consume({ body: "Different entry" }, { body: "Before" }).patch).toEqual({ body: "Before" });
  });
});

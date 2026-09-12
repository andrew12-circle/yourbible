import { journalChangedFields, journalValueEqual, type JournalValues } from "./journalSaveQueue";

/** External updates are not user edits until React has displayed them. */
export class JournalViewAdoption {
  private pending = new Map<string, { before: unknown; after: unknown }>();
  reset(): void { this.pending.clear(); }
  stage(previous: JournalValues, patch: JournalValues): void {
    for (const [key, after] of Object.entries(patch)) {
      const existing = this.pending.get(key);
      this.pending.set(key, { before: existing ? existing.before : previous[key], after });
    }
  }
  consume(previous: JournalValues, rendered: JournalValues): { observed: JournalValues; patch: JournalValues } {
    const observed = { ...rendered };
    const patch = journalChangedFields(previous, rendered);
    for (const [key, change] of this.pending) {
      if (journalValueEqual(rendered[key], change.before)) {
        // A hide/Done event before the external setState commits must not undo it.
        observed[key] = previous[key];
        delete patch[key];
      } else if (journalValueEqual(rendered[key], change.after)) {
        delete patch[key];
        this.pending.delete(key);
      } else {
        this.pending.delete(key);
      }
    }
    return { observed, patch };
  }
}

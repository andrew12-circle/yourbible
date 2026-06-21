import { describe, expect, it } from "vitest";
import {
  READER_STUDY_LAYOUT_DEFAULT,
  resolveStudyLayout,
  studyLayoutPreferenceLabel,
} from "@/lib/bible/readerStudyLayout";

describe("readerStudyLayout", () => {
  it("defaults new readers to inline for accuracy", () => {
    expect(READER_STUDY_LAYOUT_DEFAULT).toBe("inline");
  });

  it("resolves auto to holman for study editions only", () => {
    expect(resolveStudyLayout("auto", "CSB")).toBe("holman");
    expect(resolveStudyLayout("auto", "ESV")).toBe("inline");
  });

  it("labels inline as recommended", () => {
    expect(studyLayoutPreferenceLabel("inline")).toMatch(/recommended/i);
  });
});

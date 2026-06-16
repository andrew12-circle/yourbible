import { describe, expect, it } from "vitest";
import { isMyAiProjectsTableMissing } from "@/lib/myai/chatProjects";

describe("isMyAiProjectsTableMissing", () => {
  it("detects PostgREST schema cache errors", () => {
    expect(
      isMyAiProjectsTableMissing(
        "Could not find the table 'public.my_ai_projects' in the schema cache",
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMyAiProjectsTableMissing("permission denied for table my_ai_chats")).toBe(false);
  });
});

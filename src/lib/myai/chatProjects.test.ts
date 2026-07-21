import { describe, expect, it } from "vitest";
import {
  MY_AI_PROJECT_MEMORY_MAX_LENGTH,
  isMyAiProjectsTableMissing,
  normalizeMyAiProjectMemory,
} from "@/lib/myai/chatProjects";

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

describe("normalizeMyAiProjectMemory", () => {
  it("trims outer whitespace while preserving intentional newlines", () => {
    expect(normalizeMyAiProjectMemory("  First rule\r\nSecond rule  ")).toBe("First rule\nSecond rule");
  });

  it("caps saved memory to the project prompt budget", () => {
    const oversized = "a".repeat(MY_AI_PROJECT_MEMORY_MAX_LENGTH + 20);
    expect(normalizeMyAiProjectMemory(oversized)).toHaveLength(MY_AI_PROJECT_MEMORY_MAX_LENGTH);
  });
});

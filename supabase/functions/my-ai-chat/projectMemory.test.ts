import { describe, expect, it } from "vitest";
import { formatProjectMemoryContext } from "./projectMemory";

describe("formatProjectMemoryContext", () => {
  it("returns no context when project memory is empty", () => {
    expect(formatProjectMemoryContext({ name: "Faith", memory: "   " })).toBeNull();
    expect(formatProjectMemoryContext(null)).toBeNull();
  });

  it("formats saved project memory for retrieval", () => {
    const block = formatProjectMemoryContext({
      name: "Loom AI",
      memory: "User fears lost context.\r\nAlways connect back to prior project decisions.",
    });

    expect(block).toContain("## Project memory");
    expect(block).toContain("Project: Loom AI");
    expect(block).toContain("User fears lost context.\nAlways connect back");
  });

  it("caps long memory before injection", () => {
    const block = formatProjectMemoryContext({ name: "Long", memory: "a".repeat(4500) });
    expect(block?.length).toBeLessThan(4300);
    expect(block?.endsWith("...")).toBe(true);
  });
});

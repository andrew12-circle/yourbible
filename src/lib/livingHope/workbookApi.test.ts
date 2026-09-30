import { describe, expect, it, vi } from "vitest";
import { mergeWorkbookStories } from "./workbookApi";
import { mergeWorkbook, type WorkbookStory } from "./workbookTypes";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

const original: WorkbookStory = {
  id: "morning",
  title: "A peaceful morning",
  text: "My morning narrative.",
  cover_image_url: "/morning-scenes/peaceful-morning.svg",
  cover_storage_path: "owner/morning.png",
  chatgpt_url: "https://chatgpt.com/c/morning",
  narration_audio_url: "https://example.test/morning.mp3",
  narration_storage_path: "owner/morning.mp3",
  narration_file_name: "morning.mp3",
  narration_provider: "elevenlabs",
};

describe("workbook scene merges", () => {
  it("keeps restored server metadata when a browser loaded the damaged text-only scenes", () => {
    // Use the real parser: a damaged stored row becomes an object with undefined
    // metadata properties, rather than only id/text properties in memory.
    const base = mergeWorkbook({ stories: [{ id: original.id, text: original.text }] }).stories;
    const desired = [{ ...base[0], text: "A new sentence from the stale tab." }];
    const current = [{ ...original }];

    expect(mergeWorkbookStories(base, desired, current)).toEqual([
      { ...original, text: "A new sentence from the stale tab." },
    ]);
    expect(current).toEqual([original]);
  });

  it("does not interpret omitted fields from a text-only editor as metadata deletion", () => {
    const desired = [{ id: original.id, text: "Changed in an older editor." }];

    expect(mergeWorkbookStories([original], desired, [original])).toEqual([
      { ...original, text: "Changed in an older editor." },
    ]);
  });

  it("merges independent local and server edits while giving a deliberate local field edit priority", () => {
    const desired = [{ ...original, title: "My renamed scene" }];
    const current = [{ ...original, title: "Earlier name", text: "Updated server narrative.", cover_image_url: "/new-art.webp" }];

    expect(mergeWorkbookStories([original], desired, current)).toEqual([
      { ...current[0], title: "My renamed scene" },
    ]);
  });

  it("honors explicit metadata clears without erasing fields the user left alone", () => {
    const desired: WorkbookStory[] = [{
      ...original,
      title: "",
      cover_storage_path: undefined,
      narration_storage_path: undefined,
      narration_file_name: undefined,
    }];
    const merged = mergeWorkbookStories([original], desired, [{ ...original, text: "Server narrative." }]);

    expect(merged).toEqual([{ ...desired[0], text: "Server narrative." }]);
    expect(merged[0].cover_image_url).toBe(original.cover_image_url);
    expect(merged[0].chatgpt_url).toBe(original.chatgpt_url);
    expect(JSON.parse(JSON.stringify(merged[0]))).not.toHaveProperty("narration_storage_path");
  });

  it("preserves remotely added scenes while honoring an explicit local deletion and addition", () => {
    const deleted: WorkbookStory = { id: "remove", title: "Remove me", text: "Deleted narrative." };
    const remote: WorkbookStory = { id: "remote", title: "Added remotely", text: "Remote narrative." };
    const local: WorkbookStory = { id: "local", title: "Added here", text: "Local narrative." };

    expect(mergeWorkbookStories([original, deleted], [original, local], [original, deleted, remote])).toEqual([
      original, remote, local,
    ]);
  });
});

import { describe, expect, it, vi } from "vitest";
import { API_BIBLE_CSB_ID } from "./bibleEditions";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke } },
}));

import { fetchLifeGuide, fetchLifeGuideFollowUp, type LifeGuideResult } from "./lifeGuide";

const guide: LifeGuideResult = {
  topic: "Anxiety",
  summary: "",
  passages: [],
  action_steps: [],
  prayer: "",
};

describe("Life Guide bundled CSB protection", () => {
  it("rejects a bundled-CSB search before invoking its edge function", async () => {
    await expect(fetchLifeGuide("I am worried", API_BIBLE_CSB_ID)).rejects.toThrow(
      "API.Bible was not used",
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects a bundled-CSB follow-up before invoking its edge function", async () => {
    await expect(fetchLifeGuideFollowUp({
      issue: "I am worried",
      bibleId: API_BIBLE_CSB_ID,
      question: "What do I do?",
      guide,
      history: [],
    })).rejects.toThrow("API.Bible was not used");
    expect(invoke).not.toHaveBeenCalled();
  });
});

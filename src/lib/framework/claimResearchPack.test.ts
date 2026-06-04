import { describe, expect, it } from "vitest";
import {
  formatPassageFetchError,
  formatResearchPackMarkdown,
  partitionScriptureEntries,
  sanitizeResearchSectionBody,
} from "./claimResearchPack";

describe("formatPassageFetchError", () => {
  it("extracts nested API message instead of raw JSON", () => {
    const raw =
      'bible-passage 404: {"error":"API.Bible: 404","details":"{\\"statusCode\\":404,\\"message\\":\\"Could not find that passage\\"}"}';
    expect(formatPassageFetchError(raw)).toBe("Not available in your selected Bible translation.");
  });

  it("maps 404 bible-passage to a friendly line", () => {
    expect(formatPassageFetchError("bible-passage 404: something")).toBe(
      "Not available in your selected Bible translation.",
    );
  });
});

describe("partitionScriptureEntries", () => {
  it("splits loaded text from failed refs", () => {
    const { loaded, failed } = partitionScriptureEntries([
      { ref: "Romans 12:2", text: "And be not conformed…" },
      {
        ref: "2 Corinthians 12:9",
        error: 'bible-passage 404: {"message":"Could not find that passage"}',
      },
    ]);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].ref).toBe("Romans 12:2");
    expect(failed).toHaveLength(1);
    expect(failed[0].message).toBe("Not available in your selected Bible translation.");
  });
});

describe("sanitizeResearchSectionBody", () => {
  it("removes epistemic prefix from model body", () => {
    expect(sanitizeResearchSectionBody("Epistemic: scripture_text\n\nBody here.")).toBe("Body here.");
  });
});

describe("formatResearchPackMarkdown", () => {
  it("does not duplicate passage errors under reference notes", () => {
    const md = formatResearchPackMarkdown({
      pack_type: "validation",
      sections: {
        bible_alignment: { body: "Summary here.", epistemic: "unknown" },
      },
      scripture: [
        {
          ref: "2 Corinthians 12:9",
          error: 'bible-passage 404: {"message":"Could not find that passage"}',
        },
      ],
      meta: {
        ref_parse_errors: [
          {
            ref: "2 Corinthians 12:9",
            error: 'bible-passage 404: {"message":"Could not find that passage"}',
          },
        ],
      },
    });
    expect(md).toContain("## Passages we could not load");
    expect(md).toContain("Not available in your selected Bible translation");
    expect(md).not.toContain("## Reference notes");
    expect(md).not.toContain('{"error"');
  });
});

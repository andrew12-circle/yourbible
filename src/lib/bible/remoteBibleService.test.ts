import { describe, expect, it } from "vitest";
import { API_BIBLE_CSB_ID } from "./bibleEditions";
import {
  assertRemoteBibleServiceAllowed,
  BUNDLED_BIBLE_REMOTE_SERVICE_ERROR,
  usesBundledBible,
} from "./remoteBibleService";

describe("remote Bible service policy", () => {
  it("blocks the bundled CSB before a remote feature can use it", () => {
    expect(usesBundledBible(API_BIBLE_CSB_ID)).toBe(true);
    expect(() => assertRemoteBibleServiceAllowed(API_BIBLE_CSB_ID)).toThrow(
      BUNDLED_BIBLE_REMOTE_SERVICE_ERROR,
    );
  });

  it("leaves an explicit non-bundled edition available to remote features", () => {
    expect(usesBundledBible("external-edition")).toBe(false);
    expect(() => assertRemoteBibleServiceAllowed("external-edition")).not.toThrow();
  });
});

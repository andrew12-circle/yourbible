import { describe, expect, it } from "vitest";
import { splitTextForPrivacyBlur } from "./privacyBlurTextSplit";

describe("splitTextForPrivacyBlur", () => {
  it("returns empty segments for empty text", () => {
    expect(splitTextForPrivacyBlur("", 0)).toEqual({ blurred: "", visible: "" });
  });

  it("keeps a single word visible when caret is inside it", () => {
    const text = "hello";
    expect(splitTextForPrivacyBlur(text, 3)).toEqual({ blurred: "", visible: "hello" });
  });

  it("blurs earlier words and shows only the current word mid-type", () => {
    const text = "I had a terrible day";
    expect(splitTextForPrivacyBlur(text, 13)).toEqual({
      blurred: "I had a ",
      visible: "terrible",
    });
  });

  it("shows last completed word plus new word after spacing forward", () => {
    const text = "I had a terrible day";
    expect(splitTextForPrivacyBlur(text, 17)).toEqual({
      blurred: "I had a ",
      visible: "terrible day",
    });
  });

  it("shows only current word when caret is on the first word", () => {
    const text = "hello world";
    expect(splitTextForPrivacyBlur(text, 3)).toEqual({
      blurred: "",
      visible: "hello",
    });
  });

  it("handles caret after trailing space before next word", () => {
    const text = "hello world";
    expect(splitTextForPrivacyBlur(text, 6)).toEqual({
      blurred: "",
      visible: "hello world",
    });
  });

  it("handles mid-word caret on second word", () => {
    const text = "hello world";
    expect(splitTextForPrivacyBlur(text, 8)).toEqual({
      blurred: "hello ",
      visible: "world",
    });
  });

  it("handles leading whitespace", () => {
    const text = "  hello";
    expect(splitTextForPrivacyBlur(text, 4)).toEqual({
      blurred: "  ",
      visible: "hello",
    });
  });

  it("handles newlines as word boundaries", () => {
    const text = "line one\nline two";
    expect(splitTextForPrivacyBlur(text, 16)).toEqual({
      blurred: "line one\nline ",
      visible: "two",
    });
  });

  it("clamps caret beyond text length", () => {
    const text = "abc def";
    expect(splitTextForPrivacyBlur(text, 999)).toEqual({
      blurred: "abc ",
      visible: "def",
    });
  });

  it("clamps negative caret", () => {
    const text = "abc def";
    expect(splitTextForPrivacyBlur(text, -5)).toEqual({
      blurred: "",
      visible: "abc",
    });
  });
});

import { describe, expect, it } from "vitest";
import { splitTextForPrivacyBlur } from "./privacyBlurTextSplit";

describe("splitTextForPrivacyBlur", () => {
  it("returns empty segments for empty text", () => {
    expect(splitTextForPrivacyBlur("", 0)).toEqual({
      blurred: "",
      visible: "",
      blurredAfter: "",
    });
  });

  it("keeps a single word visible when caret is inside it", () => {
    const text = "hello";
    expect(splitTextForPrivacyBlur(text, 3)).toEqual({
      blurred: "",
      visible: "hello",
      blurredAfter: "",
    });
  });

  it("shows last completed word plus the word being typed", () => {
    const text = "I had a terrible day";
    expect(splitTextForPrivacyBlur(text, 13)).toEqual({
      blurred: "I had ",
      visible: "a terrible",
      blurredAfter: " day",
    });
  });

  it("shows last completed word plus new word after spacing forward", () => {
    const text = "I had a terrible day";
    expect(splitTextForPrivacyBlur(text, 17)).toEqual({
      blurred: "I had a ",
      visible: "terrible day",
      blurredAfter: "",
    });
  });

  it("shows only current word when caret is on the first word", () => {
    const text = "hello world";
    expect(splitTextForPrivacyBlur(text, 3)).toEqual({
      blurred: "",
      visible: "hello",
      blurredAfter: " world",
    });
  });

  it("handles caret after trailing space before next word", () => {
    const text = "hello world";
    expect(splitTextForPrivacyBlur(text, 6)).toEqual({
      blurred: "",
      visible: "hello world",
      blurredAfter: "",
    });
  });

  it("shows previous word plus current word mid-type on second word", () => {
    const text = "hello world";
    expect(splitTextForPrivacyBlur(text, 8)).toEqual({
      blurred: "",
      visible: "hello world",
      blurredAfter: "",
    });
  });

  it("handles leading whitespace", () => {
    const text = "  hello";
    expect(splitTextForPrivacyBlur(text, 4)).toEqual({
      blurred: "  ",
      visible: "hello",
      blurredAfter: "",
    });
  });

  it("handles newlines as word boundaries", () => {
    const text = "line one\nline two";
    expect(splitTextForPrivacyBlur(text, 16)).toEqual({
      blurred: "line one\n",
      visible: "line two",
      blurredAfter: "",
    });
  });

  it("clamps caret beyond text length", () => {
    const text = "abc def";
    expect(splitTextForPrivacyBlur(text, 999)).toEqual({
      blurred: "",
      visible: "abc def",
      blurredAfter: "",
    });
  });

  it("clamps negative caret", () => {
    const text = "abc def";
    expect(splitTextForPrivacyBlur(text, -5)).toEqual({
      blurred: "",
      visible: "abc",
      blurredAfter: " def",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  openAiMaxOutputFields,
  openAiSupportsCustomTemperature,
  openAiTemperatureField,
  openAiUsesMaxCompletionTokens,
} from "../../../supabase/functions/_shared/openAiModelParams.ts";

describe("openAiUsesMaxCompletionTokens", () => {
  it("uses max_completion_tokens for gpt-5.x", () => {
    expect(openAiUsesMaxCompletionTokens("gpt-5.5")).toBe(true);
    expect(openAiUsesMaxCompletionTokens("GPT-5-mini")).toBe(true);
    expect(openAiUsesMaxCompletionTokens("openai/gpt-5.5")).toBe(true);
  });

  it("uses max_completion_tokens for o-series", () => {
    expect(openAiUsesMaxCompletionTokens("o1")).toBe(true);
    expect(openAiUsesMaxCompletionTokens("o3-mini")).toBe(true);
  });

  it("uses max_tokens for legacy chat models", () => {
    expect(openAiUsesMaxCompletionTokens("gpt-4o")).toBe(false);
    expect(openAiUsesMaxCompletionTokens("gpt-4.1")).toBe(false);
    expect(openAiUsesMaxCompletionTokens("gpt-4o-mini")).toBe(false);
  });
});

describe("openAiMaxOutputFields", () => {
  it("maps gpt-5.5 to max_completion_tokens", () => {
    expect(openAiMaxOutputFields("gpt-5.5", 4096)).toEqual({ max_completion_tokens: 4096 });
  });

  it("maps gpt-4o to max_tokens", () => {
    expect(openAiMaxOutputFields("gpt-4o", 4096)).toEqual({ max_tokens: 4096 });
  });
});

describe("openAiTemperatureField", () => {
  it("omits temperature for gpt-5.5", () => {
    expect(openAiTemperatureField("gpt-5.5", 0.55)).toEqual({});
    expect(openAiSupportsCustomTemperature("gpt-5.5")).toBe(false);
  });

  it("includes temperature for gpt-4o", () => {
    expect(openAiTemperatureField("gpt-4o", 0.55)).toEqual({ temperature: 0.55 });
    expect(openAiSupportsCustomTemperature("gpt-4o")).toBe(true);
  });
});

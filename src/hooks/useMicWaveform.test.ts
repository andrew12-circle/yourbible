import { describe, expect, it } from "vitest";
import { frequencyBinsToWaveformLevels } from "@/hooks/useMicWaveform";

describe("frequencyBinsToWaveformLevels", () => {
  it("maps frequency data into the requested bar count", () => {
    const data = new Uint8Array([0, 64, 128, 255, 32, 16, 200, 100]);
    const levels = frequencyBinsToWaveformLevels(data, 4);
    expect(levels).toHaveLength(4);
    expect(levels.every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(levels[3]).toBeGreaterThan(levels[0]);
  });
});

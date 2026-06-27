import { describe, expect, it } from "vitest";
import {
  formatStorageBytes,
  storageMeterLevel,
  storageMeterPercent,
  STORAGE_METER_CAP_BYTES,
} from "./storageMeter";

describe("storageMeter", () => {
  it("formats bytes at common scales", () => {
    expect(formatStorageBytes(512)).toBe("512 B");
    expect(formatStorageBytes(1024 * 500)).toBe("500.0 KB");
    expect(formatStorageBytes(1024 * 1024 * 15)).toBe("15.0 MB");
    expect(formatStorageBytes(1024 * 1024 * 1024 * 2.5)).toBe("2.5 GB");
  });

  it("caps meter percent at 100", () => {
    expect(storageMeterPercent(0)).toBe(0);
    expect(storageMeterPercent(STORAGE_METER_CAP_BYTES / 2)).toBe(50);
    expect(storageMeterPercent(STORAGE_METER_CAP_BYTES * 2)).toBe(100);
  });

  it("assigns color levels by usage band", () => {
    expect(storageMeterLevel(STORAGE_METER_CAP_BYTES * 0.2)).toBe("low");
    expect(storageMeterLevel(STORAGE_METER_CAP_BYTES * 0.6)).toBe("moderate");
    expect(storageMeterLevel(STORAGE_METER_CAP_BYTES * 0.8)).toBe("high");
    expect(storageMeterLevel(STORAGE_METER_CAP_BYTES * 0.95)).toBe("critical");
  });
});

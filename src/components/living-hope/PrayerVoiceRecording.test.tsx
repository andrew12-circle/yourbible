import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrayerVoiceRecording } from "./PrayerVoiceRecording";
const storage = vi.hoisted(() => ({ upload: vi.fn(), download: vi.fn(), remove: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" }, profile: { user_id: "owner", journal_e2e_enabled: false } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => storage } } }));
class Recorder {
  static isTypeSupported() { return true; }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["test audio"], { type: this.mimeType }) }); this.onstop?.(); }
}
beforeEach(() => { storage.upload.mockReset().mockResolvedValue({ error: null }); storage.download.mockReset(); storage.remove.mockReset(); vi.stubGlobal("MediaRecorder", Recorder); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("private prayer recordings", () => {
  it("uses a separate angels slot and never removes old audio before saving a replacement", async () => {
    const stop = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) } });
    const save = vi.fn().mockResolvedValue(undefined);
    render(<PrayerVoiceRecording prayerKey="angels" label="angels prayer" onStoragePathChange={save} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record my angels prayer" })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stop recording" })); });
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatch(/^owner\/living-hope\/angels\/[a-f0-9-]+\.webm$/);
    expect(storage.upload).toHaveBeenCalledWith(expect.any(String), expect.any(Blob), expect.objectContaining({ upsert: false }));
    expect(storage.remove).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
  });
  it("retries attaching an uploaded recording without uploading it twice", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) } });
    const save = vi.fn().mockRejectedValueOnce(new Error("Could not save pointer")).mockResolvedValue(undefined);
    render(<PrayerVoiceRecording prayerKey="angels" label="angels prayer" onStoragePathChange={save} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record my angels prayer" })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stop recording" })); });
    expect(await screen.findByRole("button", { name: "Retry saving recording" })).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry saving recording" })); });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toBe(save.mock.calls[0][0]);
    expect(storage.upload).toHaveBeenCalledOnce();
  });
  it("releases delayed microphone permission after the recorder is dismissed", async () => {
    let grant!: (value: unknown) => void;
    const permission = new Promise(resolve => { grant = resolve; });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(() => permission) } });
    const stop = vi.fn(); const save = vi.fn();
    const { unmount } = render(<PrayerVoiceRecording prayerKey="angels" onStoragePathChange={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Record my prayer" }));
    unmount();
    await act(async () => { grant({ getTracks: () => [{ stop }] }); await permission; });
    expect(stop).toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});

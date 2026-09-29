import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MorningMemoryMedia, validateMemoryMedia } from "./MorningMemoryMedia";
import type { MorningMemory } from "@/lib/livingHope/morningFoundation";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), encrypted: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" }, profile: { user_id: "owner", journal_e2e_enabled: mocks.encrypted } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, createSignedUrl: vi.fn() }) } } }));
const memory: MorningMemory = { id: "memory-1", kind: "real_memory", title: "Real memory", body: "A past moment", happenedOn: "", photoPath: "", audioPath: "", sceneId: "" };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); mocks.encrypted = false; mocks.upload.mockReset(); });
describe("real-memory media safety", () => {
  it("rejects SVG and empty audio, and accepts supported media", () => {
    expect(() => validateMemoryMedia("photo", new Blob(["<svg/>"], { type: "image/svg+xml" }))).toThrow(/JPEG/);
    expect(() => validateMemoryMedia("audio", new Blob([], { type: "audio/mpeg" }))).toThrow(/30 MB/);
    expect(() => validateMemoryMedia("photo", new Blob(["photo"], { type: "image/jpeg" }))).not.toThrow();
    expect(() => validateMemoryMedia("audio", new Blob(["audio"], { type: "audio/webm;codecs=opus" }))).not.toThrow();
  });
  it("does not upload unencrypted memory media in encrypted-journal mode", () => {
    mocks.encrypted = true;
    render(<MorningMemoryMedia memory={memory} onChange={vi.fn()} onBusyChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Record this memory" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add photo" })).toBeDisabled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("releases a microphone that resolves after the editor unmounts", async () => {
    const stop = vi.fn();
    let grant!: (stream: MediaStream) => void;
    const request = new Promise<MediaStream>((resolve) => { grant = resolve; });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn(() => request) } });
    vi.stubGlobal("MediaRecorder", class {});
    const changed = vi.fn();
    const { unmount } = render(<MorningMemoryMedia memory={memory} onChange={changed} onBusyChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Record this memory" }));
    unmount();
    await act(async () => { grant({ getTracks: () => [{ stop }] } as unknown as MediaStream); await request; });
    expect(stop).toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
  });
});

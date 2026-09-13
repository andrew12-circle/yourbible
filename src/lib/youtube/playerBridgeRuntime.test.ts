// @vitest-environment node
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";
const source = readFileSync(new URL("../../../public/youtube-player.js", import.meta.url), "utf8");
function harness(parentOrigin = "capacitor://localhost") {
  const listeners: Record<string, (event: any) => void> = {};
  const parent = { postMessage: vi.fn() };
  const frame = { referrerPolicy: "" };
  const player = { getCurrentTime: () => 37, getPlayerState: () => 1, getIframe: () => frame,
    seekTo: vi.fn(), playVideo: vi.fn(), pauseVideo: vi.fn(), mute: vi.fn(), unMute: vi.fn(), destroy: vi.fn() };
  let settings: any;
  const scope: any = { URLSearchParams, location: { origin: "https://app.example", search: `?v=HbLhpMEmrqU&parent_origin=${encodeURIComponent(parentOrigin)}` },
    parent, document: { getElementById: () => ({ hidden: true }), createElement: () => ({}), head: { appendChild: vi.fn() } },
    addEventListener: (name: string, listener: any) => { listeners[name] = listener; }, setInterval: vi.fn(), clearInterval: vi.fn(),
    YT: { Player: function (_id: string, opts: any) { settings = opts; return player; } },
  };
  scope.window = scope; vm.runInNewContext(source, scope);
  return { scope, listeners, parent, player, getSettings: () => settings };
}
describe("hosted player bridge runtime", () => {
  it("creates an identified YouTube player and forwards ready/time from the actual parent", () => {
    const h = harness(); h.scope.onYouTubeIframeAPIReady();
    expect(h.getSettings().playerVars.origin).toBe("https://app.example");
    h.getSettings().events.onReady();
    expect(h.parent.postMessage).toHaveBeenCalledWith(JSON.stringify({ event: "infoDelivery", info: { currentTime: 37, playerState: 1 } }), "capacitor://localhost");
    h.listeners.message({ source: h.parent, origin: "capacitor://localhost", data: JSON.stringify({ event: "command", func: "seekTo", args: [60] }) });
    expect(h.player.seekTo).toHaveBeenCalledWith(60, true);
  });
  it("does not relay spoofed controls or arbitrary player methods", () => {
    const h = harness(); h.scope.onYouTubeIframeAPIReady(); h.getSettings().events.onReady();
    h.listeners.message({ source: {}, origin: "capacitor://localhost", data: { event: "command", func: "playVideo" } });
    h.listeners.message({ source: h.parent, origin: "https://evil.example", data: { event: "command", func: "playVideo" } });
    h.listeners.message({ source: h.parent, origin: "capacitor://localhost", data: { event: "command", func: "destroy" } });
    expect(h.player.playVideo).not.toHaveBeenCalled(); expect(h.player.destroy).not.toHaveBeenCalled();
  });
  it("refuses an arbitrary parent origin and forwards errors without retry loops", () => {
    expect(harness("https://evil.example").scope.onYouTubeIframeAPIReady).toBeUndefined();
    const h = harness(); h.scope.onYouTubeIframeAPIReady(); h.getSettings().events.onError({ data: 153 });
    expect(h.parent.postMessage).toHaveBeenCalledWith('{"event":"onError","info":153}', "capacitor://localhost");
  });
});

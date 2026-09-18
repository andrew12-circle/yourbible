import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import EntryMiniMap from "./EntryMiniMap";

const harness = vi.hoisted(() => ({
  listener: undefined as ((event: AuthChangeEvent, session: Session | null) => void) | undefined,
  getSession: vi.fn(), readProfile: vi.fn(), initForUser: vi.fn(), resetVault: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    getSession: harness.getSession,
    onAuthStateChange: (listener: typeof harness.listener) => {
      harness.listener = listener;
      return { data: { subscription: { unsubscribe: harness.unsubscribe } } };
    },
  },
  from: () => ({ select: () => ({ eq: (_column: string, userId: string) => ({ maybeSingle: () => harness.readProfile(userId) }) }) }),
} }));
vi.mock("@/stores/journalVaultStore", () => ({ useJournalVaultStore: { getState: () => ({ reset: harness.resetVault }) } }));
vi.mock("@/lib/aiWritingAssistStore", () => ({ useAiWritingAssistStore: { getState: () => ({ initForUser: harness.initForUser }) } }));
vi.mock("@/lib/framework/identitySummary", () => ({ parseIdentitySummaryPayload: () => null }));
vi.mock("@/lib/maps/googleMaps", () => ({
  getGoogleMapsApiKey: () => null, JOURNAL_DEFAULT_MAP_TYPE: "roadmap",
  openInGoogleMapsUrl: () => "#", streetViewMapsUrl: () => "#",
}));
function session(userId: string, token = "test-token"): Session {
  return { access_token: token, refresh_token: "test-refresh", expires_in: 3600, token_type: "bearer",
    user: { id: userId, email: `${userId}@example.test`, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" } };
}
function profile(userId: string) { return { data: { id: `profile-${userId}`, user_id: userId, display_name: userId }, error: null }; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
function JournalSurface() {
  const auth = useAuth();
  return <>
    <span data-testid="profile">{auth.profile?.user_id ?? "none"}</span>
    {auth.loading ? <span>Loading account</span> : auth.user ? <>
      <textarea aria-label="Journal body" defaultValue="My entry" />
      <EntryMiniMap lat={10} lng={20} height={200} />
      <span data-testid="user">{auth.user.id}</span>
    </> : <span>Signed out</span>}
  </>;
}
const settle = async () => {
  await act(async () => { await Promise.resolve(); await vi.advanceTimersByTimeAsync(1); });
};
function emit(event: AuthChangeEvent, value: Session | null) { act(() => { harness.listener!(event, value); }); }

beforeEach(() => {
  vi.useFakeTimers();
  harness.getSession.mockReset().mockResolvedValue({ data: { session: session("user-a") }, error: null });
  harness.readProfile.mockReset().mockImplementation(async (id: string) => profile(id));
  harness.unsubscribe.mockReset();
  harness.initForUser.mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("journal stays mounted during background authentication", () => {
  it("preserves the actual map and in-progress input across same-user session events", async () => {
    render(<AuthProvider><JournalSurface /></AuthProvider>);
    await settle();
    const map = screen.getByTitle("Map");
    const input = screen.getByLabelText("Journal body");
    fireEvent.change(input, { target: { value: "Still writing, do not reset" } });
    for (const event of ["TOKEN_REFRESHED", "SIGNED_IN", "SIGNED_IN"] as const) {
      emit(event, session("user-a", `token-${event}`));
      expect(screen.queryByText("Loading account")).toBeNull();
      expect(screen.getByTitle("Map")).toBe(map);
      expect(screen.getByLabelText("Journal body")).toBe(input);
      expect(input).toHaveProperty("value", "Still writing, do not reset");
      await settle();
    }
    expect(harness.readProfile).toHaveBeenCalledTimes(1);
  });

  it("hides the previous account immediately on a real account switch", async () => {
    render(<AuthProvider><JournalSurface /></AuthProvider>);
    await settle();
    const next = deferred<ReturnType<typeof profile>>();
    harness.readProfile.mockReturnValueOnce(next.promise);
    emit("SIGNED_IN", session("user-b"));
    expect(screen.queryByTitle("Map")).toBeNull();
    expect(screen.getByTestId("profile").textContent).toBe("none");
    await settle();
    await act(async () => { next.resolve(profile("user-b")); });
    expect(screen.getByTestId("user").textContent).toBe("user-b");
    expect(screen.getByTestId("profile").textContent).toBe("user-b");
  });

  it("does not restore an old profile after signing out during its load", async () => {
    const pending = deferred<ReturnType<typeof profile>>();
    harness.readProfile.mockReturnValueOnce(pending.promise);
    render(<AuthProvider><JournalSurface /></AuthProvider>);
    await settle();
    emit("SIGNED_OUT", null);
    await act(async () => { pending.resolve(profile("user-a")); });
    expect(screen.getByText("Signed out")).toBeTruthy();
    expect(screen.getByTestId("profile").textContent).toBe("none");
    expect(screen.queryByTitle("Map")).toBeNull();
  });

  it("rejects a slow profile response from the previous account", async () => {
    const old = deferred<ReturnType<typeof profile>>();
    harness.readProfile.mockReturnValueOnce(old.promise);
    render(<AuthProvider><JournalSurface /></AuthProvider>);
    await settle();
    emit("SIGNED_IN", session("user-b"));
    await settle();
    expect(screen.getByTestId("profile").textContent).toBe("user-b");
    await act(async () => { old.resolve(profile("user-a")); });
    expect(screen.getByTestId("profile").textContent).toBe("user-b");
  });

  it("does not let delayed bootstrap overwrite a newer auth event", async () => {
    const bootstrap = deferred<{ data: { session: Session }; error: null }>();
    harness.getSession.mockReturnValueOnce(bootstrap.promise);
    render(<AuthProvider><JournalSurface /></AuthProvider>);
    emit("SIGNED_IN", session("user-b"));
    await settle();
    await act(async () => { bootstrap.resolve({ data: { session: session("user-a") }, error: null }); });
    expect(screen.getByTestId("user").textContent).toBe("user-b");
    expect(screen.getByTestId("profile").textContent).toBe("user-b");
  });
});

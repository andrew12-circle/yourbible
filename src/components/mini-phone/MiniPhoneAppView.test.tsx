import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { MiniPhoneProvider } from "@/contexts/MiniPhoneContext";
import { HomeDashboardProvider } from "@/contexts/HomeDashboardContext";
import { MiniPhoneDrawer } from "@/components/mini-phone/MiniPhoneDrawer";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";
import { useEffect } from "react";

const { mockAuth, MockAuthContext } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react") as typeof import("react");
  const auth = {
    user: { id: "user-1", email: "test@example.com" },
    profile: { layout: JSON.stringify({ homeMode: "hub" }), display_name: "Test User", onboarded: true },
    loading: false,
  };
  return { mockAuth: auth, MockAuthContext: React.createContext(auth) };
});

vi.mock("@/contexts/AuthContext", () => ({
  AuthContext: MockAuthContext,
  useAuth: () => mockAuth,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
          limit: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          head: true,
        }),
        limit: () => Promise.resolve({ data: [], error: null }),
        or: () => ({
          lt: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          gte: () => Promise.resolve({ data: null, count: 0, error: null }),
        }),
      }),
    }),
  },
}));

function OpenPhoneWithRoute({ route }: { route: string }) {
  const { open, openApp } = useMiniPhone();
  useEffect(() => {
    open();
    openApp(route);
  }, [open, openApp, route]);
  return null;
}

function renderDrawer(route: string) {
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <HomeDashboardProvider>
          <MiniPhoneProvider>
            <OpenPhoneWithRoute route={route} />
            <MiniPhoneDrawer />
          </MiniPhoneProvider>
        </HomeDashboardProvider>
      </QueryClientProvider>
    </BrowserRouter>,
  );
}

describe("MiniPhoneDrawer", () => {
  it.each(["/framework", "/framework/daily", "/settings"])(
    "loads %s without the phone error boundary",
    async (route) => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      renderDrawer(route);

      await waitFor(
        () => {
          expect(screen.queryByText(/couldn't load in the phone/i)).not.toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      consoleError.mockRestore();
    },
    15000,
  );
});

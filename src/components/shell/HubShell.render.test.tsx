import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HubShell } from "@/components/shell/HubShell";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "test@example.com" },
    profile: { layout: "{}", display_name: "Test User" },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
        eq: () => ({
          select: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
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

describe("HubShell", () => {
  it("renders without throwing when hub children are provided", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <HubShell>
            <div>Hub child content</div>
          </HubShell>
        </MemoryRouter>,
      ),
    ).not.toThrow();

    expect(screen.getByText("Hub child content")).toBeInTheDocument();
    expect(screen.getByText("Your Bible")).toBeInTheDocument();
  });
});

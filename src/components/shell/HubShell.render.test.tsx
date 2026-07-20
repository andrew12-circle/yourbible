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
  function renderHubShell(path = "/home") {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <HubShell>
          <div>Hub child content</div>
        </HubShell>
      </MemoryRouter>,
    );
  }

  it("renders without throwing when hub children are provided", () => {
    expect(() => renderHubShell()).not.toThrow();

    expect(screen.getByText("Hub child content")).toBeInTheDocument();
    expect(screen.getByText("Belief")).toBeInTheDocument();
  });

  it("shows the mini phone tab on regular hub routes", () => {
    renderHubShell("/home");

    expect(screen.getByLabelText("Toggle phone")).toBeInTheDocument();
  });

  it("hides the mini phone tab in children books", () => {
    renderHubShell("/children-books/lilly-how-mommy-daddy-met");

    expect(screen.queryByLabelText("Toggle phone")).not.toBeInTheDocument();
  });
});

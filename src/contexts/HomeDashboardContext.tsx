import { createContext, useContext, type ReactNode } from "react";
import { useHomeDashboardData } from "@/hooks/useHomeDashboardData";

type HomeDashboardValue = ReturnType<typeof useHomeDashboardData>;

const HomeDashboardContext = createContext<HomeDashboardValue | null>(null);

export function HomeDashboardProvider({ children }: { children: ReactNode }) {
  const value = useHomeDashboardData();
  return (
    <HomeDashboardContext.Provider value={value}>
      {children}
    </HomeDashboardContext.Provider>
  );
}

export function useHomeDashboard() {
  const ctx = useContext(HomeDashboardContext);
  if (!ctx) {
    throw new Error("useHomeDashboard must be used within HomeDashboardProvider");
  }
  return ctx;
}

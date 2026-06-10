import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { MiniPhoneEmbedProvider } from "@/contexts/MiniPhoneEmbedContext";
import { queryClient } from "@/lib/queryClient";

export function MiniPhoneRootProviders({
  auth,
  children,
}: {
  auth: AuthContextValue;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={auth}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MiniPhoneEmbedProvider>{children}</MiniPhoneEmbedProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

import { createContext, useContext, type ReactNode } from "react";

const MiniPhoneEmbedContext = createContext(false);

export function useMiniPhoneEmbed(): boolean {
  return useContext(MiniPhoneEmbedContext);
}

export function MiniPhoneEmbedProvider({ children }: { children: ReactNode }) {
  return (
    <MiniPhoneEmbedContext.Provider value={true}>
      {children}
    </MiniPhoneEmbedContext.Provider>
  );
}

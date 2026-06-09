import { useRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { MiniPhoneEmbedProvider } from "@/contexts/MiniPhoneEmbedContext";
import { loadMiniPhoneActiveRoute } from "@/lib/mini-phone/miniPhoneStorage";
import { MiniPhoneRoutePersist } from "@/components/mini-phone/MiniPhoneRoutePersist";
import { MiniPhoneRoutes } from "@/components/mini-phone/MiniPhoneRoutes";

interface MiniPhoneAppViewProps {
  entryRoute: string;
}

export function MiniPhoneAppView({ entryRoute }: MiniPhoneAppViewProps) {
  const sessionId = useRef(`phone-${Date.now()}`).current;
  const initialEntry = useRef(loadMiniPhoneActiveRoute() ?? entryRoute).current;

  return (
    <MiniPhoneEmbedProvider>
      <div
        data-mini-phone-app
        className="relative isolate h-full w-full overflow-hidden flex flex-col [transform:translateZ(0)]"
      >
        <MemoryRouter key={sessionId} initialEntries={[initialEntry]}>
          <MiniPhoneRoutePersist />
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            <MiniPhoneRoutes />
          </div>
        </MemoryRouter>
      </div>
    </MiniPhoneEmbedProvider>
  );
}

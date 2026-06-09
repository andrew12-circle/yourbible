import { MemoryRouter } from "react-router-dom";
import { MiniPhoneEmbedProvider } from "@/contexts/MiniPhoneEmbedContext";
import { MiniPhoneRoutePersist } from "@/components/mini-phone/MiniPhoneRoutePersist";
import { MiniPhoneRoutes } from "@/components/mini-phone/MiniPhoneRoutes";

interface MiniPhoneAppViewProps {
  entryRoute: string;
}

export function MiniPhoneAppView({ entryRoute }: MiniPhoneAppViewProps) {
  return (
    <MiniPhoneEmbedProvider>
      <div
        data-mini-phone-app
        className="relative isolate h-full w-full overflow-hidden flex flex-col [transform:translateZ(0)] animate-in slide-in-from-bottom-2 fade-in-0 duration-200"
      >
        <MemoryRouter initialEntries={[entryRoute]}>
          <MiniPhoneRoutePersist />
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <MiniPhoneRoutes />
          </div>
        </MemoryRouter>
      </div>
    </MiniPhoneEmbedProvider>
  );
}

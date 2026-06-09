import { useMemo } from "react";
import { MemoryRouter } from "react-router-dom";
import { MiniPhoneEmbedProvider } from "@/contexts/MiniPhoneEmbedContext";
import { MiniPhoneRoutes } from "@/components/mini-phone/MiniPhoneRoutes";

interface MiniPhoneAppViewProps {
  entryRoute: string;
}

export function MiniPhoneAppView({ entryRoute }: MiniPhoneAppViewProps) {
  const routerKey = useMemo(() => entryRoute, [entryRoute]);

  return (
    <MiniPhoneEmbedProvider>
      <div
        data-mini-phone-app
        className="h-full w-full overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 fade-in-0 duration-200"
      >
        <MemoryRouter key={routerKey} initialEntries={[entryRoute]}>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <MiniPhoneRoutes />
          </div>
        </MemoryRouter>
      </div>
    </MiniPhoneEmbedProvider>
  );
}

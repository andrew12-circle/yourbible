import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FrameworkGenericPageSkeleton,
  FrameworkOverviewPageSkeleton,
} from "@/components/framework/skeleton/FrameworkPageSkeleton";

function DefaultHubContentSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl md:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}

export function HubContentSkeleton() {
  const { pathname } = useLocation();

  if (pathname === "/framework") {
    return <FrameworkOverviewPageSkeleton />;
  }

  if (pathname.startsWith("/framework")) {
    return <FrameworkGenericPageSkeleton />;
  }

  return <DefaultHubContentSkeleton />;
}

import { FrameworkLayoutSkeleton } from "./FrameworkLayoutSkeleton";
import { FrameworkOverviewSkeleton } from "./FrameworkOverviewSkeleton";
import { FrameworkShimmerBlock } from "./FrameworkShimmerBlock";

function GenericFrameworkBodySkeleton() {
  return (
    <div className="space-y-6">
      <FrameworkShimmerBlock className="h-4 w-full max-w-2xl" />
      <FrameworkShimmerBlock className="h-4 w-5/6 max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FrameworkShimmerBlock className="h-32 rounded-2xl" />
        <FrameworkShimmerBlock className="h-32 rounded-2xl" />
      </div>
      <FrameworkShimmerBlock className="h-48 rounded-3xl" />
    </div>
  );
}

export function FrameworkOverviewPageSkeleton() {
  return (
    <FrameworkLayoutSkeleton titleClassName="h-7 w-28 max-w-[40%]">
      <FrameworkOverviewSkeleton />
    </FrameworkLayoutSkeleton>
  );
}

export function FrameworkGenericPageSkeleton() {
  return (
    <FrameworkLayoutSkeleton>
      <GenericFrameworkBodySkeleton />
    </FrameworkLayoutSkeleton>
  );
}

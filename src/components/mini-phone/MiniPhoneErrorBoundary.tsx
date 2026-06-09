import { Component, type ErrorInfo, type ReactNode } from "react";
import { useMiniPhone } from "@/contexts/MiniPhoneContext";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function MiniPhoneErrorFallback() {
  const { goHome } = useMiniPhone();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">This app couldn&apos;t load in the phone.</p>
      <button
        type="button"
        onClick={goHome}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to home screen
      </button>
    </div>
  );
}

export class MiniPhoneErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[mini-phone]", error, info.componentStack);
  }

  render() {
    if (this.state.error) return <MiniPhoneErrorFallback />;
    return this.props.children;
  }
}

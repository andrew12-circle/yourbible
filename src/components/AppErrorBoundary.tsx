import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appBrand";
import { captureException } from "@/lib/sentry";

type Props = { children: ReactNode };

type State = { error: Error | null };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
    captureException(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 bg-background text-foreground">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {APP_NAME} hit an unexpected error. Try reloading the page.
          </p>
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive max-w-lg break-all">
            {this.state.error.message}
          </p>
          <Button type="button" onClick={() => window.location.reload()}>
            Reload app
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

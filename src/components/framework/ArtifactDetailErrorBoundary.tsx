import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import FrameworkLayout from "@/pages/framework/FrameworkLayout";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Catches render errors on artifact detail so users see recovery UI instead of a blank page. */
export default class ArtifactDetailErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ArtifactDetailPage]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <FrameworkLayout
          title="Artifact"
          back="/framework/artifacts"
          contentClassName="max-w-none"
          headerContentClassName="max-w-none"
        >
          <div className="space-y-4 py-12">
            <p className="text-sm text-muted-foreground">
              Something went wrong loading this artifact. Try refreshing the page. If it keeps happening, open the
              browser console (F12) and share the error.
            </p>
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 font-mono text-xs text-destructive">
              {this.state.error.message}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link to="/framework/artifacts">Back to artifacts</Link>
              </Button>
            </div>
          </div>
        </FrameworkLayout>
      );
    }

    return this.props.children;
  }
}

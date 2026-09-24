import { Component, type ReactNode } from "react";
/** A map/chunk failure must never take the Scripture page down with it. */
export class VisualExplorerBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background p-5 text-center text-sm"><p>The visual explorer could not open. Your Bible page is unchanged. Reload the app before trying again.</p><button type="button" className="min-h-11 rounded border px-4" onClick={this.props.onClose}>Return to Bible image</button></div>;
    return this.props.children;
  }
}

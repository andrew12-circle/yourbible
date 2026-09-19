import { Component, type ReactNode } from "react";

export class MindSpaceBoundary extends Component<{ children: ReactNode; onClose: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">
      <p>Mind space could not open. Your regular map and saved connections are unchanged.</p>
      <button type="button" className="mt-2 min-h-11 rounded border px-3" onClick={this.props.onClose}>Return to map</button>
    </div>;
  }
}

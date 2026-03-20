import React from "react";

interface State { hasError: boolean; error?: Error }
interface Props { children: React.ReactNode; label?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? "unknown"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center space-y-3">
          <p className="text-red-400 font-medium">Something went wrong in this section.</p>
          <p className="text-slate-500 text-sm font-mono">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-synthwave-cyan border border-synthwave-cyan/50 px-3 py-1 rounded hover:bg-synthwave-cyan/10 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

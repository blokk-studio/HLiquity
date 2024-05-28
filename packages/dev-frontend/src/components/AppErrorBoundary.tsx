import { Component, ErrorInfo, ReactNode } from "react";
import { AppError } from "./AppError";

export class AppErrorBoundary extends Component<unknown, { error: Error | null }> {
  constructor(props: { children?: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("an unexpected error was caught by the error boundary.", { error, errorInfo });
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return <AppError error={this.state.error} />;
    }

    return <>{this.props.children}</>;
  }
}

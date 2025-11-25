import { Component, ErrorInfo } from "react";
import { AppError } from "./AppError";

export class AppErrorBoundary extends Component<
  { children?: React.ReactChild },
  { error: Error | null }
> {
  constructor(props: { children?: React.ReactChild }) {
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

  render() {
    if (this.state.error) {
      return (
        <AppError
          error={this.state.error}
          infoText="Please refresh the page and try again. If the error persists, try disconnecting all of your wallets and try again."
        />
      );
    }

    return <>{this.props.children}</>;
  }
}

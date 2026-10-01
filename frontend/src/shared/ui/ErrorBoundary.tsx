import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  fallback?: (error: Error, reset: () => void) => ReactNode;
  resetKey?: unknown;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error:", error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  private reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <ErrorNotice title="Something went wrong" message={error.message} onRetry={this.reset} />;
  }
}

interface NoticeProps {
  title: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorNotice({ title, message, onRetry, compact }: NoticeProps) {
  return (
    <div className={compact ? "error-notice error-notice--compact" : "error-notice"} role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--primary btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

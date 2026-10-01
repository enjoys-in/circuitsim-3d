import { Suspense, type ReactNode } from "react";
import { ErrorBoundary, ErrorNotice } from "./ErrorBoundary";

interface Props {
  name: string;
  fallback: ReactNode;
  resetKey?: unknown;
  children: ReactNode;
}

export function AsyncBoundary({ name, fallback, resetKey, children }: Props) {
  return (
    <ErrorBoundary
      resetKey={resetKey}
      fallback={(error, reset) => (
        <ErrorNotice compact title={`${name} failed to load`} message={error.message} onRetry={reset} />
      )}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}

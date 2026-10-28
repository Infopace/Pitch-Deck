import React from "react";
import { CrashScreen } from "@/components/ui/CrashScreen";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  crashed: boolean;
}

/**
 * Wraps the whole app. Before this existed, an uncaught render error had no
 * catch anywhere — React unmounts the tree and the visitor is left looking
 * at a blank white page with nothing in it and no way back.
 *
 * Must be a class component: React only calls getDerivedStateFromError /
 * componentDidCatch on class components, there is no hook equivalent.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[Mint] Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.crashed) return <CrashScreen />;
    return this.props.children;
  }
}

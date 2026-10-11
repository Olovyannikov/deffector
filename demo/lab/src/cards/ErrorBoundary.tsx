import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  /** when any of these changes, the children are rendered again */
  resetKeys: unknown[];
  children: ReactNode;
}

const changed = (previous: unknown[], next: unknown[]) =>
  previous.length !== next.length || previous.some((key, index) => !Object.is(key, next[index]));

/** Renders `fallback` instead of children that throw, until one of `resetKeys` changes. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  override componentDidUpdate(previousProps: ErrorBoundaryProps) {
    const { hasError } = this.state;
    const { resetKeys } = this.props;
    if (hasError && changed(previousProps.resetKeys, resetKeys)) this.setState({ hasError: false });
  }

  override render() {
    const { hasError } = this.state;
    const { fallback, children } = this.props;
    return hasError ? fallback : children;
  }
}

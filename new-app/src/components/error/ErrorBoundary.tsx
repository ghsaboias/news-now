'use client';

import { ErrorMessage } from '@/components/common/messages/ErrorMessage';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging
    console.group('Error Boundary Caught Error:');
    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    console.error('Component Stack:', errorInfo.componentStack);
    
    // Additional context that might be helpful
    console.info('Error occurred in:', {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: window.navigator.userAgent
    });
    console.groupEnd();

    // TODO: In the future, we could send this to an error monitoring service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <ErrorMessage
          message={this.state.error?.message ?? 'Something went wrong'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
} 
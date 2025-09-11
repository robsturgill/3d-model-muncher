import * as React from 'react';
import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 max-w-md mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>An error occurred while loading this component.</p>
              {this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer">Error details</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button 
              onClick={this.handleRetry}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specific error boundary for 3D viewer components
export function ModelViewerErrorBoundary({ children }: { children: ReactNode }) {
  const getErrorMessage = (error: Error) => {
    const message = error.message;
    
    if (message.includes('rels') || message.includes('relationship')) {
      return {
        title: 'Invalid 3MF File',
        description: 'This 3MF file appears to be corrupted or incomplete. It may have been exported incorrectly or damaged during transfer.'
      };
    } else if (message.includes('3MF') || message.includes('ThreeMF')) {
      return {
        title: '3MF Loading Error',
        description: 'Unable to parse this 3MF file. The file format may be unsupported or corrupted.'
      };
    } else if (message.includes('WebGL') || message.includes('Three')) {
      return {
        title: 'WebGL Error',
        description: 'A graphics rendering error occurred. Try refreshing the page or updating your browser.'
      };
    } else if (message.includes('timeout') || message.includes('Loading timeout')) {
      return {
        title: 'Loading Timeout',
        description: 'The 3D model took too long to load. The file may be too large or the connection may be slow.'
      };
    } else {
      return {
        title: '3D Viewer Error',
        description: 'Unable to load the 3D model viewer. Please try again.'
      };
    }
  };

  return (
    <ErrorBoundary
      fallback={null} // We'll handle the fallback in onError
      onError={(error) => {
        // Log Three.js specific errors
        console.warn('3D Viewer Error:', error.message);
        if (error.message.includes('Three') || error.message.includes('WebGL')) {
          console.warn('This appears to be a WebGL/Three.js related error');
        }
      }}
    >
      <ErrorBoundary
        fallback={
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg overflow-hidden border border-border flex items-center justify-center">
            <div className="text-center space-y-3 p-6 max-w-sm">
              <AlertCircle className="h-10 w-10 mx-auto text-amber-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">3D Model Error</p>
                <p className="text-xs text-muted-foreground">
                  Unable to load this 3D model. The file may be corrupted or incompatible.
                </p>
              </div>
            </div>
          </div>
        }
        onError={(error) => {
          const errorInfo = getErrorMessage(error);
          console.warn(`${errorInfo.title}: ${errorInfo.description}`);
        }}
      >
        {children}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
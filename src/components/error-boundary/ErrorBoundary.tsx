import React, { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { logger } from '@/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  sectionName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.critical(`Error in ${this.props.sectionName || 'component'}:`, error, errorInfo)
    this.setState({ errorInfo })

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Something went wrong</h3>
                <p className="text-sm text-muted-foreground">
                  {this.props.sectionName
                    ? `An error occurred in the ${this.props.sectionName} section.`
                    : 'An unexpected error occurred.'}
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="w-full text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Error details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{this.state.error.toString()}</pre>
                    {this.state.errorInfo && (
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <Button onClick={this.handleReset} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

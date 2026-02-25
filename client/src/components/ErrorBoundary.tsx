import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class EditorErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Editor Error Boundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        textAlign: 'center',
                        color: '#666',
                        height: '100%',
                    }}
                >
                    <div
                        style={{
                            fontSize: '48px',
                            marginBottom: '16px',
                        }}
                    >
                        ⚠️
                    </div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#333' }}>
                        Editor crashed
                    </h3>
                    <p style={{ margin: '0 0 24px 0', fontSize: '14px' }}>
                        Something went wrong with the editor. Please try reloading the page.
                    </p>
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#fff',
                            background: '#1976d2',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#1565c0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#1976d2';
                        }}
                    >
                        Reload Page
                    </button>
                    {this.state.error && (
                        <details style={{ marginTop: '24px', fontSize: '12px', color: '#999' }}>
                            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                                Error details
                            </summary>
                            <pre
                                style={{
                                    textAlign: 'left',
                                    background: '#f5f5f5',
                                    padding: '12px',
                                    borderRadius: '4px',
                                    overflow: 'auto',
                                    maxWidth: '600px',
                                }}
                            >
                                {this.state.error.toString()}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

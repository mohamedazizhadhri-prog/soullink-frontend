"use client";

import React from "react";

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ServerErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        console.error("=== SERVER VIEW CRASH ===");
        console.error("Error:", error.message);
        console.error("Stack:", error.stack);
        console.error("Component Stack:", errorInfo.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 32,
                    background: "#1a1a2e",
                    color: "#fff",
                    fontFamily: "monospace",
                    borderRadius: 12,
                    margin: 16,
                    border: "1px solid #ef4444"
                }}>
                    <h2 style={{ color: "#ef4444", marginBottom: 12 }}>
                        ⚠️ Component Crash Detected
                    </h2>
                    <p style={{ color: "#fca5a5", marginBottom: 16 }}>
                        <strong>Error:</strong> {this.state.error?.message}
                    </p>
                    <details open>
                        <summary style={{ cursor: "pointer", color: "#a78bfa", marginBottom: 8 }}>
                            Stack Trace (click to collapse)
                        </summary>
                        <pre style={{
                            background: "#0f0f1a",
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 11,
                            overflow: "auto",
                            maxHeight: 300,
                            color: "#fbbf24"
                        }}>
                            {this.state.error?.stack}
                        </pre>
                    </details>
                    <details>
                        <summary style={{ cursor: "pointer", color: "#a78bfa", marginTop: 8 }}>
                            Component Stack
                        </summary>
                        <pre style={{
                            background: "#0f0f1a",
                            padding: 16,
                            borderRadius: 8,
                            fontSize: 11,
                            overflow: "auto",
                            maxHeight: 200,
                            color: "#6ee7b7"
                        }}>
                            {this.state.errorInfo?.componentStack}
                        </pre>
                    </details>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        style={{
                            marginTop: 16,
                            padding: "8px 20px",
                            background: "#6d28d9",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer"
                        }}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

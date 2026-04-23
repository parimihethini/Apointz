import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', background: '#0b1121', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Something went wrong.</h1>
          <p style={{ opacity: 0.7, marginBottom: '32px' }}>A runtime error occurred. We've logged the issue.</p>
          <pre style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', fontSize: '0.9rem', maxWidth: '80%', overflow: 'auto', marginBottom: '32px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ padding: '12px 32px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800' }}
          >
            Back to Safety
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

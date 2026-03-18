import React from 'react';

interface State { hasError: boolean }

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ws-page-center">
          <div className="ws-card">
            <p style={{ color: 'var(--ws-muted)', marginBottom: 16 }}>
              Qualcosa è andato storto.
            </p>
            <a className="ws-btn ws-btn-secondary ws-btn-full" href="/">
              Torna alla home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

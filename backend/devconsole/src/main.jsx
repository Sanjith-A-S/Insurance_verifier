import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './context.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error in ClaimLens DevConsole:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, maxWidth: 800, margin: '40px auto', background: '#14141c', borderRadius: 28, color: '#D6D6DC' }}>
          <h2 style={{ color: '#FF4D4D', marginBottom: 12 }}>Application Error</h2>
          <p style={{ marginBottom: 16 }}>The ClaimLens DevConsole encountered an unexpected error during render:</p>
          <pre style={{ background: '#0b0b0f', padding: 16, borderRadius: 16, color: '#FF4D4D', overflowX: 'auto', fontFamily: 'monospace' }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => {
              localStorage.removeItem('claimlens_devconsole_user');
              window.location.reload();
            }}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              background: '#0047AB',
              color: '#fff',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


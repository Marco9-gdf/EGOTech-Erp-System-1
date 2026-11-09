import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Egotech Runtime Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '20px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>!</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
              Egotech Cloud Platform
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '20px' }}>
              An issue occurred while initializing the user interface. Click below to reset stored sessions and reload cleanly.
            </p>
            <div style={{
              padding: '12px',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid #334155',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#f43f5e',
              wordBreak: 'break-word',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              {this.state.error?.message || 'Unknown runtime error'}
            </div>
            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Clear Session & Reload Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)

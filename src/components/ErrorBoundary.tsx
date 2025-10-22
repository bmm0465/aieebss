'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 에러 리포팅 (선택사항)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem'
          }}>
            😵
          </div>
          <h2 style={{
            color: '#dc3545',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            문제가 발생했습니다
          </h2>
          <p style={{
            color: '#6c757d',
            textAlign: 'center',
            marginBottom: '2rem',
            maxWidth: '500px'
          }}>
            예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              🔄 페이지 새로고침
            </button>
            <button
              onClick={() => window.history.back()}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              ← 이전 페이지
            </button>
          </div>
          
          {/* 개발 모드에서만 에러 상세 정보 표시 */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              maxWidth: '100%',
              overflow: 'auto'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                🔍 개발자 정보 (클릭하여 펼치기)
              </summary>
              <div style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Stack:</strong>
                  <pre style={{ 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    backgroundColor: '#e9ecef',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    marginTop: '0.25rem'
                  }}>
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      wordBreak: 'break-word',
                      backgroundColor: '#e9ecef',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginTop: '0.25rem'
                    }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// 간단한 에러 표시 컴포넌트
export function ErrorMessage({ 
  message, 
  onRetry,
  className = '' 
}: { 
  message: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#fff5f5',
      border: '1px solid #fed7d7',
      borderRadius: '8px',
      color: '#c53030'
    }} className={className}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: '#e53e3e',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

// 네트워크 에러 전용 컴포넌트
export function NetworkError({ 
  onRetry,
  className = '' 
}: { 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <ErrorMessage
      message="네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요."
      onRetry={onRetry}
      className={className}
    />
  );
}

// 권한 에러 전용 컴포넌트
export function PermissionError({ 
  message = "이 페이지에 접근할 권한이 없습니다.",
  className = '' 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#fffaf0',
      border: '1px solid #fbd38d',
      borderRadius: '8px',
      color: '#c05621'
    }} className={className}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>{message}</p>
      <button
        onClick={() => window.location.href = '/lobby'}
        style={{
          backgroundColor: '#ed8936',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        홈으로 이동
      </button>
    </div>
  );
}

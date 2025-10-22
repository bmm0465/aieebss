'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// 토스트 타입 정의
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// 토스트 컨텍스트 훅
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// 토스트 아이콘
const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return 'ℹ️';
  }
};

// 토스트 색상
const getToastColors = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        background: '#f0f9ff',
        border: '#22c55e',
        text: '#15803d'
      };
    case 'error':
      return {
        background: '#fef2f2',
        border: '#ef4444',
        text: '#dc2626'
      };
    case 'warning':
      return {
        background: '#fffbeb',
        border: '#f59e0b',
        text: '#d97706'
      };
    case 'info':
      return {
        background: '#eff6ff',
        border: '#3b82f6',
        text: '#2563eb'
      };
    default:
      return {
        background: '#f9fafb',
        border: '#6b7280',
        text: '#374151'
      };
  }
};

// 개별 토스트 컴포넌트
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const colors = getToastColors(toast.type);
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 애니메이션을 위한 지연
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleRemove = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 300); // 애니메이션 시간
  }, [toast.id, onRemove]);

  return (
    <div
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isLeaving ? 0 : 1,
        transition: 'all 0.3s ease-in-out',
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        minWidth: '300px',
        maxWidth: '500px',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ fontSize: '1.25rem', flexShrink: 0 }}>
          {getToastIcon(toast.type)}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{
            margin: 0,
            marginBottom: toast.message ? '0.25rem' : 0,
            fontSize: '1rem',
            fontWeight: 'bold',
            color: colors.text
          }}>
            {toast.title}
          </h4>
          {toast.message && (
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: colors.text,
              opacity: 0.8
            }}>
              {toast.message}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              style={{
                marginTop: '0.5rem',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.text,
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleRemove}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: colors.text,
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0',
            flexShrink: 0
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

// 토스트 컨테이너
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// 토스트 프로바이더
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000, // 기본 5초
      ...toast
    };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// 편의 함수들
export function useToastHelpers() {
  const { addToast } = useToast();

  const success = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'success', title, message, ...options });
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'error', title, message, duration: 0, ...options }); // 에러는 수동으로 닫기
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'warning', title, message, ...options });
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: Partial<Toast>) => {
    addToast({ type: 'info', title, message, ...options });
  }, [addToast]);

  return { success, error, warning, info };
}

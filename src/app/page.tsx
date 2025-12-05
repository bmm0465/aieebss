'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // [수정] 새로운 클라이언트 경로
import React from 'react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // [핵심 수정] 함수 내부에서 createClient()를 호출하여 supabase 객체 생성
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      router.push('/lobby');
    } catch (error) {
      if (error instanceof Error) {
        alert('로그인 정보가 올바르지 않습니다: ' + error.message);
      } else {
        alert('알 수 없는 에러가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 스타일 정의 ---
  const pageStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  };

  const formContainerStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    padding: '2.5rem 3rem',
    borderRadius: '20px',
    border: '1px solid rgba(99, 102, 241, 0.1)',
    width: '420px',
    color: '#1f2937',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontFamily: 'var(--font-nanum-pen)',
    fontSize: '2.8rem',
    marginBottom: '2rem',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 'bold',
    letterSpacing: '-0.02em',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    marginTop: '8px',
    boxSizing: 'border-box',
    backgroundColor: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    color: '#1f2937',
    fontSize: '0.95rem',
    transition: 'all 0.2s ease',
  };
  
  const inputFocusStyle = `
    input:focus {
      outline: none;
      border-color: #6366f1;
      background-color: #ffffff;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
    label {
      color: #4b5563;
      font-size: 0.9rem;
      font-weight: 500;
      display: block;
      margin-bottom: 0.5rem;
    }
  `;

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 24px',
    marginTop: '1.5rem',
    background: loading ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
    boxShadow: loading ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
    transition: 'all 0.3s ease',
    transform: loading ? 'none' : 'translateY(0)',
  };
  
  const buttonHoverStyle = `
    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.4);
    }
    button:active:not(:disabled) {
      transform: translateY(0);
    }
  `;

  return (
    <div style={pageStyle}>
      <style>{inputFocusStyle}{buttonHoverStyle}</style>
      <div style={formContainerStyle}>
        <h1 style={titleStyle}>초등 영어 기초 학력 진단 평가 플랫폼</h1>
        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="email">로그인 이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <label htmlFor="password">로그인 암호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? '로그인 중...' : '로그인하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
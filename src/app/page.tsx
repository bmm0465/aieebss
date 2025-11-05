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
        alert('입학 암호가 올바르지 않아요: ' + error.message);
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
    padding: '2rem 3rem',
    borderRadius: '15px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    width: '380px',
    color: '#171717',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontFamily: 'var(--font-nanum-pen)',
    fontSize: '2.5rem',
    marginBottom: '2rem',
    color: '#FFD700',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    marginTop: '6px',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    color: '#171717',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    marginTop: '1.5rem',
    backgroundColor: loading ? '#BDB76B' : '#FFD700',
    color: 'black',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1rem',
  };

  return (
    <div style={pageStyle}>
      <div style={formContainerStyle}>
        <h1 style={titleStyle}>달빛 마법학교 입학처</h1>
        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="email">마법사 등록 이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label htmlFor="password">마법사 등록 암호</label>
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
            {loading ? '마법진 그리는 중...' : '마법학교 입장하기'}
          </button>
        </form>
      </div>
    </div>
  )
}
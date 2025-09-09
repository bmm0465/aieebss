// app/page.js
'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false) // 로딩 상태 추가

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      alert('입학을 환영합니다, 예비 마법사님!');
      // TODO: 로그인 성공 후 평가 대기실 페이지로 이동

    } catch (error) { // 'error: any' 에서 ': any'를 제거합니다.
      
      // 👇 여기가 수정 포인트입니다!
      // error가 실제로 Error 객체인지 확인합니다.
      if (error instanceof Error) {
        alert('입학 암호가 올바르지 않아요: ' + error.message);
      } else {
        // 일반적인 Error 객체가 아닐 경우를 대비한 처리
        alert('알 수 없는 에러가 발생했습니다.');
      }

    } finally {
      setLoading(false);
    }
  };

  // --- 스타일 정의 ---
  const pageStyle = {
    backgroundImage: `url('/background.jpg')`, // public 폴더의 이미지 사용
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  };

  const formContainerStyle = {
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // 반투명 검은색 배경
    padding: '2rem 3rem',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '380px',
    color: 'white',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  };

  const titleStyle = {
    textAlign: 'center',
    fontFamily: 'var(--font-nanum-pen)', // layout.js에서 설정한 폰트 변수 사용
    fontSize: '2.5rem',
    marginBottom: '2rem',
    color: '#FFD700', // 금색
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginTop: '6px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    color: 'white',
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    marginTop: '1.5rem',
    backgroundColor: loading ? '#BDB76B' : '#FFD700', // 로딩 중이면 색상 변경
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
            <label htmlFor="password">입학 암호</label>
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
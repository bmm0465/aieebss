'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // [수정] 새로운 클라이언트 경로
import React from 'react';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio('/bgm.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => console.error("Audio play failed:", error));
      }
      setIsPlaying(!isPlaying);
    }
  };

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
    backgroundImage: `url('/background.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  };

  const formContainerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: '2rem 3rem',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '380px',
    color: 'white',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '4px',
    color: 'white',
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

  const musicButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid #FFD700',
    color: '#FFD700',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    fontSize: '1.5rem',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  return (
    <div style={pageStyle}>
      <button style={musicButtonStyle} onClick={togglePlay}>
        {isPlaying ? '🔊' : '🔇'}
      </button>

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
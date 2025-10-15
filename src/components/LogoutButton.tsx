'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm('정말 로그아웃 하시겠습니까?')) {
      return;
    }

    setLoggingOut(true);
    const supabase = createClient();
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push('/');
      router.refresh(); // 페이지 새로고침
    } catch (error) {
      console.error('로그아웃 에러:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
      setLoggingOut(false);
    }
  };

  return (
    <>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        style={{
          backgroundColor: loggingOut ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.2)',
          color: '#F44336',
          border: '2px solid rgba(244, 67, 54, 0.5)',
          padding: '0.6rem 1.2rem',
          borderRadius: '6px',
          cursor: loggingOut ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '0.9rem',
          transition: 'all 0.3s ease'
        }}
        className="logout-button"
      >
        {loggingOut ? '로그아웃 중...' : '🚪 로그아웃'}
      </button>

      <style jsx>{`
        .logout-button:hover:not(:disabled) {
          background-color: rgba(244, 67, 54, 0.4) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </>
  );
}


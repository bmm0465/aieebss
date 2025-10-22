'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AuthRedirectProps {
  to: string
  message: string
}

export default function AuthRedirect({ to, message }: AuthRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    console.log('[AuthRedirect] Redirecting to:', to)
    router.replace(to)
  }, [to, router])

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white'
    }}>
      <div style={{
        textAlign: 'center', 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '2rem', 
        borderRadius: '15px',
        maxWidth: '600px'
      }}>
        <h1 style={{ color: '#FFD700', marginBottom: '1rem' }}>⚠️ {message}</h1>
        <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
          페이지를 이동하는 중입니다...
        </p>
        <div style={{ 
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255, 215, 0, 0.3)',
          borderTop: '4px solid #FFD700',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}


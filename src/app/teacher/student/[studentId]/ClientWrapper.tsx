'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ClientWrapper({ children, studentId }: { children: React.ReactNode, studentId: string }) {
  const [checking, setChecking] = useState(true)
  const [sessionValid, setSessionValid] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkClientSession = async () => {
      console.log('[ClientWrapper] 🔍 Checking client-side session for studentId:', studentId)
      
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      console.log('[ClientWrapper] 📊 Session check result:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id,
        error: sessionError?.message
      })

      if (sessionError || !session) {
        console.error('[ClientWrapper] ❌ No valid session - redirecting to lobby')
        router.replace('/lobby')
        return
      }

      console.log('[ClientWrapper] ✅ Valid session found')
      setSessionValid(true)
      setChecking(false)
    }

    checkClientSession()
  }, [studentId, router])

  if (checking) {
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
          borderRadius: '15px'
        }}>
          <h2 style={{ color: '#FFD700' }}>🔐 세션 확인 중...</h2>
          <div style={{ 
            marginTop: '1rem',
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

  if (!sessionValid) {
    return null
  }

  return <>{children}</>
}


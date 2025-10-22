'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SessionInfo {
  hasSession: boolean
  userEmail?: string
  userId?: string
  error?: string
}

export default function SessionDebug() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      console.log('[SessionDebug] 🔍 Client-side session check:', {
        hasSession: !!session,
        user: session?.user?.email,
        error: error?.message
      })

      setSessionInfo({
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id,
        error: error?.message
      })
    }

    checkSession()
  }, [])

  if (!sessionInfo) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: sessionInfo.hasSession ? '#4CAF50' : '#F44336',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      border: `2px solid ${sessionInfo.hasSession ? '#4CAF50' : '#F44336'}`
    }}>
      <div><strong>🔐 세션 상태:</strong></div>
      <div>{sessionInfo.hasSession ? '✅ 로그인됨' : '❌ 로그인 안됨'}</div>
      {sessionInfo.userEmail && <div>📧 {sessionInfo.userEmail}</div>}
      {sessionInfo.error && <div>⚠️ {sessionInfo.error}</div>}
    </div>
  )
}


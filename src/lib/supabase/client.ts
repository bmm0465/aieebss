// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // 디버깅용 - 모든 인증 기능 비활성화
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'implicit',
        // 자동 리다이렉트 완전 비활성화
        redirectTo: undefined,
        // 세션 확인 비활성화
        skipBrowserRedirect: true,
      },
    }
  )
}
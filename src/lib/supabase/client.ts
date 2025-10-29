// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // 디버깅용 - 자동 리다이렉트 비활성화
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        // 자동 리다이렉트 완전 비활성화
        flowType: 'implicit',
      },
    }
  )
}
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // 세션 자동 갱신 활성화
        autoRefreshToken: true,
        persistSession: true,
        // 세션 감지 활성화
        detectSessionInUrl: true,
      },
    }
  )
}
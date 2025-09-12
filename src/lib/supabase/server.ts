import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 사용자 세션이 필요한 페이지용 클라이언트 (예: results 페이지)
export const createClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value, 
              ...options,
              // 세션 지속성을 위한 추가 설정
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          } catch (error) {
            console.error('Cookie set error:', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ 
              name, 
              value: '', 
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          } catch (error) {
            console.error('Cookie remove error:', error);
          }
        },
      },
    }
  );
};

// 서비스 역할용 클라이언트 (API 라우트에서 사용)
export const createServiceClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
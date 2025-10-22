import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // teacher 경로는 middleware를 완전히 건너뜀 (각 페이지에서 자체적으로 인증 처리)
  if (pathname.startsWith('/teacher')) {
    console.log('[Middleware] Skipping teacher path:', pathname);
    return NextResponse.next();
  }
  
  // 추가 보안: teacher 경로는 절대 인증 체크하지 않음
  if (pathname.includes('/teacher/')) {
    console.log('[Middleware] Teacher path detected, skipping auth:', pathname);
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // IMPORTANT: Avoid writing any logic between createServerClient and
    // await supabase.auth.getUser(). A simple mistake could make
    // it so that your user session is not refreshed.
    const { error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('[Middleware] Auth error:', pathname, error.message)
    }
  } catch (error) {
    console.error('[Middleware] Catch error:', pathname, error)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * middleware를 완전히 비활성화
     * 모든 경로에서 middleware 실행 안함
     */
    '/((?!.*).*)', // 이렇게 하면 아무 경로도 매치되지 않음
  ],
}

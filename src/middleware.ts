import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 정적 파일이나 API 경로는 건너뛰기
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // 로그인 페이지나 로비는 인증 체크하지 않음
  if (pathname === '/' || pathname === '/lobby') {
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
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('[Middleware] Auth error:', pathname, error?.message || 'No user found')
      // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    console.log('[Middleware] ✅ Auth success for:', pathname, user.email)
  } catch (error) {
    console.error('[Middleware] Catch error:', pathname, error)
    // 에러 발생 시에도 로그인 페이지로 리다이렉트
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 모든 경로에서 middleware 실행하되, 정적 파일과 API는 제외
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

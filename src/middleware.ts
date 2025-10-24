import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // teacher 경로는 middleware를 완전히 건너뜀 (각 페이지에서 자체적으로 인증 처리)
  if (pathname.startsWith('/teacher')) {
    console.log('[Middleware] Skipping teacher path:', pathname);
    return NextResponse.next();
  }
  
  // 정적 파일들도 middleware를 건너뜀
  if (pathname.match(/\.(jpg|jpeg|gif|png|svg|ico|mp3|wav|mp4|webm|css|js|woff|woff2|ttf|eot)$/)) {
    console.log('[Middleware] Skipping static file:', pathname);
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
     * 정적 파일들과 teacher 경로는 제외하고 나머지 경로에서만 middleware 실행
     */
    '/((?!_next/static|_next/image|favicon.ico|teacher|.*\\.(?:jpg|jpeg|gif|png|svg|ico|mp3|wav|mp4|webm|css|js|woff|woff2|ttf|eot)).*)',
  ],
}

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 정적 파일이나 API 경로는 건너뛰기
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // 정적 파일들도 middleware를 건너뜀
  if (pathname.match(/\.(jpg|jpeg|gif|png|svg|ico|mp3|wav|mp4|webm|css|js|woff|woff2|ttf|eot)$/)) {
    return NextResponse.next();
  }
  
  // 로그인 페이지는 인증 체크하지 않음
  if (pathname === '/') {
    return NextResponse.next();
  }

  try {
    const { supabase, response } = createClient(request);

    // 쿠키 정보 로깅 (디버깅용)
    const authCookies = request.cookies.getAll().filter(cookie => 
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    );
    console.log('[Middleware] Auth cookies found:', authCookies.length);

    // 세션을 갱신합니다.
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('[Middleware] Auth error:', pathname, error.message, error.code);
      // 인증 에러가 발생한 경우 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    if (!user) {
      console.log('[Middleware] No user found for:', pathname);
      // 사용자가 없는 경우 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // 세션 갱신 시도
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('[Middleware] Session refresh failed:', refreshError.message);
      } else {
        console.log('[Middleware] Session refreshed successfully');
      }
    } catch (refreshError) {
      console.warn('[Middleware] Session refresh exception:', refreshError);
      // 세션 갱신 실패는 무시하고 계속 진행
    }
    
    console.log('[Middleware] ✅ Auth success for:', pathname, user.email, user.id);
    return response;
  } catch (e) {
    console.error('[Middleware] Catch error:', pathname, e);
    // 에러 발생 시에도 로그인 페이지로 리다이렉트
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

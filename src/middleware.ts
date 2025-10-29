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
    console.log('[Middleware] Processing:', pathname, 'Auth cookies:', authCookies.length);

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
    
    // 미들웨어에서는 세션 갱신을 하지 않음 (클라이언트에서 처리)
    // 단순히 현재 세션의 유효성만 확인
    
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
     * 임시로 미들웨어 비활성화 - 페이지 레벨에서 인증 처리
     * 문제 해결 후 다시 활성화 예정
     */
    // '/((?!_next/static|_next/image|favicon.ico|api|.*\\.).*)',
  ],
}

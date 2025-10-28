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

    // 세션을 갱신합니다.
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('[Middleware] Auth error:', pathname, error?.message || 'No user found');
      // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('[Middleware] ✅ Auth success for:', pathname, user.email);
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

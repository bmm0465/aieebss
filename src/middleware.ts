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

    // 간단한 인증 확인
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('[Middleware] Auth failed for:', pathname, error?.message || 'No user');
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    console.log('[Middleware] ✅ Auth success for:', pathname, user.email);
    return response;
  } catch (e) {
    console.error('[Middleware] Error:', pathname, e);
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * 교사 관련 페이지만 미들웨어 적용
     */
    '/teacher/:path*',
    '/results/:path*',
  ],
}

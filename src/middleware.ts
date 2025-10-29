import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 미들웨어 완전 비활성화 - 디버깅용
  console.log('[Middleware] DISABLED - Allowing all requests:', request.nextUrl.pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 임시로 미들웨어 완전 비활성화 - 디버깅용
     */
    // '/teacher/:path*',
    // '/results/:path*',
  ],
}

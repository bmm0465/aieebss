import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('MIDDLEWARE: Processing request for:', pathname)
  
  // Supabase 클라이언트 생성 및 세션 갱신
  // 이는 서버 컴포넌트와 API 라우트가 최신 인증 상태를 가질 수 있도록 보장합니다
  // 중요: 인증 체크는 하지 않고, 세션 갱신만 수행합니다
  // 인증 체크는 각 페이지 컴포넌트나 API 라우트에서 처리합니다
  const { supabase, response } = createClient(request)
  
  // 세션 갱신 - getSession() 호출 자체가 만료된 토큰을 갱신하고 쿠키를 업데이트합니다
  // 인증 체크는 하지 않음 - 단순히 세션을 갱신만 함
  await supabase.auth.getSession()
  
  // 인증 체크 제거 - 각 페이지와 API에서 처리하도록 함
  // 세션이 갱신된 응답 반환
  return response
}

export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 요청 경로와 일치시킵니다:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화 파일)
     * - favicon.ico (파비콘 파일)
     * - api (API 라우트는 자체적으로 인증 처리)
     * 이는 보호된 경로와 공개된 경로 모두에서 세션을 갱신하기 위함입니다.
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}

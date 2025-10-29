import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('MIDDLEWARE: Processing request for:', pathname)
  
  // teacher/student/[studentId] 경로 처리
  if (pathname.startsWith('/teacher/student/') && pathname !== '/teacher/student') {
    const studentId = pathname.split('/').pop()
    console.log('MIDDLEWARE: Student ID detected:', studentId)
    
    // 동적 라우트로 리다이렉트
    return NextResponse.rewrite(new URL(`/teacher/student/${studentId}`, request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/teacher/student/:path*'
  ]
}

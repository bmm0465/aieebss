import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 사용자 프로필 조회 API
 * 학년 수준 등 기본 정보 제공
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('grade_level')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('프로필 조회 오류:', error);
      return NextResponse.json(
        { error: '프로필 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gradeLevel: profile?.grade_level || null
    });
  } catch (error) {
    console.error('사용자 프로필 조회 오류:', error);
    return NextResponse.json(
      { error: '프로필 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


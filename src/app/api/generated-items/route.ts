import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 캐싱 방지
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching generated items list');
    
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('API: Auth check - user:', user?.id, 'error:', userError);

    if (userError || !user) {
      console.log('API: Unauthorized access');
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { 
          status: 401,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const gradeLevel = searchParams.get('gradeLevel');
    const testType = searchParams.get('testType');

    let query = supabase
      .from('generated_test_items')
      .select('*')
      .eq('generated_by', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    if (testType) {
      query = query.eq('test_type', testType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: '문항 목록 조회 실패: ' + error.message },
        { status: 500 }
      );
    }

    console.log('API: Returning items list successfully, count:', data?.length || 0);
    return NextResponse.json({
      success: true,
      items: data || []
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('문항 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '문항 목록 조회 중 오류가 발생했습니다.' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  }
}


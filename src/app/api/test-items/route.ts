import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 승인된 테스트 문항 조회 API
 * 학생 테스트 페이지에서 사용할 문항을 제공
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('testType');
    const gradeLevel = searchParams.get('gradeLevel');

    if (!testType) {
      return NextResponse.json(
        { error: 'testType 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 승인된 문항 조회
    let query = supabase
      .from('generated_test_items')
      .select('id, test_type, grade_level, items, status, created_at')
      .eq('status', 'approved')
      .eq('test_type', testType)
      .order('created_at', { ascending: false })
      .limit(1);

    // 학년 수준 필터링 (있는 경우)
    if (gradeLevel) {
      query = query.eq('grade_level', gradeLevel);
    }

    const { data, error } = await query;

    if (error) {
      console.error('문항 조회 오류:', error);
      return NextResponse.json(
        { error: '문항 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    // 승인된 문항이 없으면 null 반환 (클라이언트에서 폴백 사용)
    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        item: null,
        message: '승인된 문항이 없습니다. 기본 문항을 사용합니다.'
      });
    }

    const item = data[0];
    const items = item.items as Record<string, unknown>;

    // 테스트 유형에 맞는 문항 추출
    let testItems: unknown = null;
    switch (testType) {
      case 'LNF':
        testItems = items.LNF;
        break;
      case 'PSF':
        testItems = items.PSF;
        break;
      case 'NWF':
        testItems = items.NWF;
        break;
      case 'WRF':
        testItems = items.WRF;
        break;
      case 'ORF':
        testItems = items.ORF;
        break;
      case 'MAZE':
        testItems = items.MAZE;
        break;
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        testType: item.test_type,
        gradeLevel: item.grade_level,
        items: testItems,
        createdAt: item.created_at
      }
    });
  } catch (error) {
    console.error('테스트 문항 조회 오류:', error);
    return NextResponse.json(
      { error: '문항 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


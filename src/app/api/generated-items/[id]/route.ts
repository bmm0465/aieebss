import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from('generated_test_items')
      .select('*')
      .eq('id', id)
      .eq('generated_by', user.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: '문항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 워크플로우 이력 조회
    const { data: workflow } = await supabase
      .from('item_approval_workflow')
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        workflow: workflow || []
      }
    });
  } catch (error) {
    console.error('문항 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '문항 상세 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


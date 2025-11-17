import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 캐싱 방지
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('API: Fetching generated item detail for ID:', id);
    console.log('API: Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('API: Request cookies:', request.cookies.getAll());
    
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('API: Auth check - user:', user?.id, 'user email:', user?.email, 'error:', userError);

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

    // 교사 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('API: Profile check - profile:', profile);

    if (!profile || profile.role !== 'teacher') {
      console.log('API: Not a teacher');
      return NextResponse.json(
        { error: '교사 권한이 필요합니다.' },
        { 
          status: 403,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from('generated_test_items')
      .select('*')
      .eq('id', id)
      .eq('generated_by', user.id)
      .single();

    console.log('API: Item query - item:', item ? 'found' : 'not found', 'error:', itemError);

    if (itemError || !item) {
      console.log('API: Item not found');
      return NextResponse.json(
        { error: '문항을 찾을 수 없습니다.' },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }
        }
      );
    }

    // 워크플로우 이력 조회
    const { data: workflow } = await supabase
      .from('item_approval_workflow')
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    console.log('API: Returning data successfully');
    return NextResponse.json({
      success: true,
      item: {
        ...item,
        workflow: workflow || []
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('문항 상세 조회 오류:', error);
    return NextResponse.json(
      { error: '문항 상세 조회 중 오류가 발생했습니다.' },
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


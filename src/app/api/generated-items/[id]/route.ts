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

    console.log('API: Querying generated_test_items for id:', id);
    const { data: item, error: itemError } = await supabase
      .from('generated_test_items')
      .select('*')
      .eq('id', id)
      .single();

    console.log('API: Item query result:');
    console.log('API: - item exists:', !!item);
    console.log('API: - item id:', item?.id);
    console.log('API: - item test_type:', item?.test_type);
    console.log('API: - itemError:', itemError);
    console.log('API: - itemError code:', itemError?.code);
    console.log('API: - itemError message:', itemError?.message);
    console.log('API: - itemError details:', itemError?.details);
    console.log('API: - itemError hint:', itemError?.hint);

    if (itemError) {
      console.log('API: Item query error occurred:', JSON.stringify(itemError, null, 2));
      // RLS 정책 위반인 경우
      if (itemError.code === 'PGRST116' || itemError.message?.includes('permission') || itemError.message?.includes('policy')) {
        console.log('API: RLS policy violation detected');
        return NextResponse.json(
          { error: '접근 권한이 없습니다. RLS 정책을 확인해주세요.', details: itemError.message },
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
    }

    if (!item) {
      console.log('API: Item not found (null or undefined)');
      return NextResponse.json(
        { error: '문항을 찾을 수 없습니다.', details: itemError?.message || 'No item returned' },
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
    console.log('API: Querying workflow for item_id:', id);
    const { data: workflow, error: workflowError } = await supabase
      .from('item_approval_workflow')
      .select('*')
      .eq('item_id', id)
      .order('created_at', { ascending: true });

    console.log('API: Workflow query result:');
    console.log('API: - workflow count:', workflow?.length || 0);
    console.log('API: - workflowError:', workflowError);

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


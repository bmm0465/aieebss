import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApprovalWorkflowAgent } from '@/lib/agents/ApprovalWorkflowAgent';

export async function POST(
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

    const body = await request.json();
    const { notes } = body;

    if (!notes || notes.trim().length === 0) {
      return NextResponse.json(
        { error: '거부 사유를 입력해야 합니다.' },
        { status: 400 }
      );
    }

    const agent = new ApprovalWorkflowAgent();
    await agent.initialize();

    const result = await agent.rejectItem(id, user.id, notes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '문항 거부 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '문항이 거부되었습니다.'
    });
  } catch (error) {
    console.error('문항 거부 오류:', error);
    return NextResponse.json(
      { error: '문항 거부 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


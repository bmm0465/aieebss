import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OrchestratorAgent } from '@/lib/agents/OrchestratorAgent';
import type { ItemGenerationRequest } from '@/lib/agents/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      testTypes,
      gradeLevel,
      pdfIds,
      referenceDocument,
      customInstructions
    } = body;

    // 입력 검증
    if (!testTypes || !Array.isArray(testTypes) || testTypes.length === 0) {
      return NextResponse.json(
        { error: '최소 1개 이상의 평가 유형을 선택해야 합니다.' },
        { status: 400 }
      );
    }

    if (!gradeLevel) {
      return NextResponse.json(
        { error: '학년 수준을 선택해야 합니다.' },
        { status: 400 }
      );
    }

    // Agent 기반 문항 생성
    const orchestrator = new OrchestratorAgent();
    await orchestrator.initialize();

    const request: ItemGenerationRequest = {
      testTypes,
      gradeLevel,
      pdfIds: pdfIds || [],
      referenceDocument,
      customInstructions
    };

    const result = await orchestrator.generateItems(request, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '문항 생성 실패' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      items: result.items,
      itemId: result.itemId,
      qualityScore: result.qualityScore,
      pdfReferences: result.pdfReferences
    });
  } catch (error) {
    console.error('Agent 기반 문항 생성 오류:', error);
    return NextResponse.json(
      { error: '문항 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


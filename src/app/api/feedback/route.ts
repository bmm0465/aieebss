import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { buildHattieSystemPrompt, buildHattieUserPrompt, getHattieFeedbackExamples } from '@/lib/feedback/hattiePrompts';
import { summarizeSessionData, formatDataForLLM } from '@/lib/feedback/feedbackAnalyzer';
import type { SessionDataForFeedback, HattieFeedbackResponse } from '@/lib/feedback/feedbackTypes';
import type { TestType } from '@/lib/agents/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI API 키 확인
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
}

export async function POST(request: Request) {
  try {
    console.log('피드백 API 호출 시작');
    const { testType, sessionId, question, studentAnswer, isCorrect, errorType } = await request.json();
    console.log('요청 데이터:', { testType, sessionId, hasQuestion: !!question, hasStudentAnswer: !!studentAnswer });

    // sessionId가 있으면 데이터베이스에서 조회, 없으면 직접 전달된 데이터 사용
    let feedbackData;
    
    if (sessionId && testType) {
      console.log('세션 ID를 통한 데이터베이스 조회 시작:', sessionId);
      // sessionId를 통해 데이터베이스에서 해당 세션의 결과 조회
      const supabase = await createClient();
      
      // sessionId에서 날짜 추출 (예: "2024-01-15_123456" -> "2024-01-15")
      const [dateStr] = sessionId.split('_');
      const sessionDate = new Date(dateStr);
      console.log('추출된 날짜:', dateStr, '세션 날짜:', sessionDate.toISOString());
      
      // 현재 사용자 인증 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('사용자 인증 오류:', userError);
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
      }
      
      const { data: results, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('test_type', testType)
        .gte('created_at', sessionDate.toISOString().split('T')[0])
        .lt('created_at', new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('created_at', { ascending: false });
      
      console.log('데이터베이스 조회 결과:', { resultsCount: results?.length, error });

      if (error) {
        console.error('데이터베이스 조회 오류:', error);
        return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
      }

      if (!results || results.length === 0) {
        return NextResponse.json({ error: '해당 세션의 결과를 찾을 수 없습니다.' }, { status: 404 });
      }

      // 전체 세션 데이터를 종합 피드백용으로 구성
      const sessionData: SessionDataForFeedback = {
        testType: testType as TestType,
        totalQuestions: results.length,
        correctAnswers: results.filter(r => r.is_correct).length,
        accuracy: (results.filter(r => r.is_correct).length / results.length) * 100,
        questions: results.map(r => ({
          question: r.question || r.question_word || r.question_passage || '문항',
          studentAnswer: r.student_answer || '',
          correctAnswer: r.correct_answer || '',
          isCorrect: r.is_correct || false,
          errorType: r.error_type || null,
          correctSegments: r.correct_segments || 0,
          targetSegments: r.target_segments || 0,
          wcpm: r.wcpm || 0,
          accuracy: r.accuracy || 0,
          timeTaken: r.time_taken || null,
        })),
      };

      feedbackData = sessionData;
    } else {
      // 개별 문항 피드백은 더 이상 지원하지 않음 (Hattie 프레임워크는 세션 전체 분석 필요)
      return NextResponse.json({ 
        error: '세션 데이터가 필요합니다. sessionId와 testType을 제공해주세요.' 
      }, { status: 400 });
    }

    // Hattie 프레임워크 기반 피드백 생성
    console.log('Hattie 피드백 API 호출 시작');
    
    // 세션 데이터인지 확인
    const isSessionData = feedbackData && 'totalQuestions' in feedbackData;
    
    if (!isSessionData) {
      return NextResponse.json({ 
        error: '세션 데이터가 필요합니다. sessionId와 testType을 제공해주세요.' 
      }, { status: 400 });
    }
    
    const sessionData = feedbackData as SessionDataForFeedback;
    
    try {
      // 오류 패턴 분석
      const summary = summarizeSessionData(sessionData.questions);
      const dataSummary = formatDataForLLM(summary);
      
      // 학생 프로필에서 학년 정보 가져오기 (있는 경우)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      let gradeLevel: string | undefined;
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('grade_level')
          .eq('id', user.id)
          .single();
        
        if (profile?.grade_level) {
          gradeLevel = profile.grade_level;
        }
      }
      
      // Hattie 프레임워크 기반 프롬프트 생성
      const systemPrompt = buildHattieSystemPrompt(sessionData.testType, gradeLevel);
      const userPrompt = buildHattieUserPrompt(sessionData);
      const examples = getHattieFeedbackExamples();
      
      const fullUserPrompt = `${userPrompt}\n\n${dataSummary}\n\n${examples}`;
      
      console.log('OpenAI API 호출 시작 (Hattie 프레임워크)');
      
      const feedbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: fullUserPrompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      const rawFeedback = JSON.parse(feedbackResponse.choices[0].message.content || '{}');
      console.log('OpenAI 응답 파싱 완료:', rawFeedback);
      
      // 응답 검증 및 정규화
      const hattieFeedback: HattieFeedbackResponse = {
        feedUp: rawFeedback.feedUp || '목표를 확인해보세요.',
        feedBack: {
          taskLevel: Array.isArray(rawFeedback.feedBack?.taskLevel) 
            ? rawFeedback.feedBack.taskLevel 
            : rawFeedback.feedBack?.taskLevel 
              ? [rawFeedback.feedBack.taskLevel] 
              : [],
          processLevel: Array.isArray(rawFeedback.feedBack?.processLevel)
            ? rawFeedback.feedBack.processLevel
            : rawFeedback.feedBack?.processLevel
              ? [rawFeedback.feedBack.processLevel]
              : [],
          selfRegulation: Array.isArray(rawFeedback.feedBack?.selfRegulation)
            ? rawFeedback.feedBack.selfRegulation
            : rawFeedback.feedBack?.selfRegulation
              ? [rawFeedback.feedBack.selfRegulation]
              : [],
        },
        feedForward: Array.isArray(rawFeedback.feedForward)
          ? rawFeedback.feedForward
          : rawFeedback.feedForward
            ? [rawFeedback.feedForward]
            : [],
        errorPatterns: Array.isArray(rawFeedback.errorPatterns)
          ? rawFeedback.errorPatterns
          : rawFeedback.errorPatterns
            ? [rawFeedback.errorPatterns]
            : undefined,
        strengths: Array.isArray(rawFeedback.strengths)
          ? rawFeedback.strengths
          : rawFeedback.strengths
            ? [rawFeedback.strengths]
            : undefined,
      };
      
      // 한국어 사용 검증 (간단한 휴리스틱)
      const allText = JSON.stringify(hattieFeedback);
      const koreanCharCount = (allText.match(/[가-힣]/g) || []).length;
      const totalCharCount = allText.replace(/[\s{}[\]",:]/g, '').length;
      const koreanRatio = totalCharCount > 0 ? koreanCharCount / totalCharCount : 0;
      
      if (koreanRatio < 0.5) {
        console.warn('한국어 비율이 낮습니다:', koreanRatio);
        // 재시도는 하지 않고 경고만 로깅 (너무 많은 재시도 방지)
      }
      
      console.log('최종 Hattie 피드백 응답:', hattieFeedback);
      return NextResponse.json(hattieFeedback);
      
    } catch (openaiError: unknown) {
      console.error('OpenAI API 오류:', openaiError);
      const errorMessage = openaiError instanceof Error ? openaiError.message : '알 수 없는 오류';
      
      // 기본 피드백 제공 (한국어)
      const fallbackFeedback: HattieFeedbackResponse = {
        feedUp: '이번 평가에서 목표를 달성하기 위해 노력한 점이 훌륭해요.',
        feedBack: {
          taskLevel: ['평가를 완료한 점이 좋아요.'],
          processLevel: ['계속 연습하면 더 좋아질 거예요.'],
          selfRegulation: ['평가를 끝까지 완료한 노력이 인상적이에요.'],
        },
        feedForward: ['다음에는 더 많은 연습을 해보면 좋을 것 같아요.'],
      };
      
      return NextResponse.json(fallbackFeedback);
    }

  } catch (error) {
    console.error('피드백 생성 에러:', error);
    return NextResponse.json({ 
      feedback: "좋은 시도입니다!",
      tip: "계속 노력해보세요!"
    });
  }
}
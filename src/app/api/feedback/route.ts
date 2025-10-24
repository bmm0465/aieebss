import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

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
      const sessionData = {
        testType,
        totalQuestions: results.length,
        correctAnswers: results.filter(r => r.is_correct).length,
        accuracy: (results.filter(r => r.is_correct).length / results.length) * 100,
        questions: results.map(r => ({
          question: r.question || r.question_word || r.question_passage || '문항',
          studentAnswer: r.student_answer || '',
          isCorrect: r.is_correct || false,
          errorType: r.error_type || null,
          correctSegments: r.correct_segments || 0,
          targetSegments: r.target_segments || 0,
          wcpm: r.wcpm || 0,
          accuracy: r.accuracy || 0
        }))
      };

      feedbackData = sessionData;
    } else {
      // 직접 전달된 데이터 사용 (기존 방식)
      if (!testType || !question || !studentAnswer) {
        return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
      }
      
      feedbackData = {
        testType,
        question,
        studentAnswer,
        isCorrect: isCorrect || false,
        errorType: errorType || null
      };
    }

    // 종합 피드백 생성
    console.log('OpenAI API 호출 시작, 피드백 데이터:', feedbackData);
    
    let aiFeedback: { 
      feedback?: string; 
      tip?: string;
      strengths?: string[];
      improvements?: string[];
      nextSteps?: string[];
    } = {};
    
    try {
      // 세션 데이터인지 개별 문항 데이터인지 확인
      const isSessionData = feedbackData && 'totalQuestions' in feedbackData;
      
      let systemPrompt = '';
      
      if (isSessionData) {
        // 전체 세션 종합 피드백
        const sessionData = feedbackData as any;
        systemPrompt = `You are an expert EFL teacher providing comprehensive feedback for DIBELS assessments. 
        
        STUDENT PERFORMANCE SUMMARY:
        - Test Type: ${sessionData.testType}
        - Total Questions: ${sessionData.totalQuestions}
        - Correct Answers: ${sessionData.correctAnswers}
        - Overall Accuracy: ${sessionData.accuracy.toFixed(1)}%
        
        DETAILED RESULTS:
        ${sessionData.questions.map((q: any, i: number) => 
          `${i + 1}. Question: "${q.question}" | Student Answer: "${q.studentAnswer}" | ${q.isCorrect ? 'CORRECT' : 'INCORRECT'}${q.errorType ? ` | Error: ${q.errorType}` : ''}${q.correctSegments ? ` | Segments: ${q.correctSegments}/${q.targetSegments}` : ''}${q.wcpm ? ` | WCPM: ${q.wcpm}` : ''}`
        ).join('\n')}
        
        TASK: Provide comprehensive feedback that includes:
        1. Overall performance assessment
        2. Specific strengths identified
        3. Areas needing improvement
        4. Concrete next steps for learning
        
        GUIDELINES:
        - Be encouraging but honest about performance
        - Identify specific patterns in errors
        - Provide actionable improvement strategies
        - Use Korean for emotional support, English for technical terms
        - Focus on learning progression, not just scores
        
        Respond with JSON: {
          "feedback": "overall assessment message",
          "tip": "main learning tip",
          "strengths": ["strength1", "strength2"],
          "improvements": ["improvement1", "improvement2"],
          "nextSteps": ["step1", "step2"]
        }`;
      } else {
        // 개별 문항 피드백 (기존 방식)
        const individualData = feedbackData as any;
        systemPrompt = `You are an encouraging EFL teacher providing real-time feedback for DIBELS assessments. 
        
        CONTEXT: ${individualData.testType} test
        QUESTION: ${individualData.question}
        STUDENT ANSWER: ${individualData.studentAnswer}
        RESULT: ${individualData.isCorrect ? 'Correct' : 'Incorrect'}
        ERROR TYPE: ${individualData.errorType || 'None'}
        
        GUIDELINES:
        1. Be encouraging and supportive
        2. Provide specific, actionable feedback
        3. Use simple Korean when appropriate
        4. Keep feedback brief (1-2 sentences)
        5. Focus on what the student did well
        6. If incorrect, gently guide toward the correct answer
        
        Respond with JSON: {"feedback": "encouraging message", "tip": "helpful tip"}`;
      }

      const feedbackResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          }
        ],
        response_format: { type: 'json_object' },
      });

      aiFeedback = JSON.parse(feedbackResponse.choices[0].message.content || '{}');
      console.log('OpenAI 응답 파싱 완료:', aiFeedback);
    } catch (openaiError) {
      console.error('OpenAI API 오류:', openaiError);
      // OpenAI API 오류 시 기본 피드백 제공
      aiFeedback = {
        feedback: "좋은 시도입니다!",
        tip: "계속 노력해보세요!"
      };
    }
    
    const response = {
      feedback: aiFeedback.feedback || "좋은 시도입니다!",
      tip: aiFeedback.tip || "계속 노력해보세요!",
      strengths: aiFeedback.strengths || [],
      improvements: aiFeedback.improvements || [],
      nextSteps: aiFeedback.nextSteps || []
    };
    
    console.log('최종 응답:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('피드백 생성 에러:', error);
    return NextResponse.json({ 
      feedback: "좋은 시도입니다!",
      tip: "계속 노력해보세요!"
    });
  }
}
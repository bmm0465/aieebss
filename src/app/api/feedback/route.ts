import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { testType, sessionId, question, studentAnswer, isCorrect, errorType } = await request.json();

    // sessionId가 있으면 데이터베이스에서 조회, 없으면 직접 전달된 데이터 사용
    let feedbackData;
    
    if (sessionId && testType) {
      // sessionId를 통해 데이터베이스에서 해당 세션의 결과 조회
      const supabase = await createClient();
      
      const { data: results, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('test_type', testType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('데이터베이스 조회 오류:', error);
        return NextResponse.json({ error: '데이터 조회 중 오류가 발생했습니다.' }, { status: 500 });
      }

      if (!results || results.length === 0) {
        return NextResponse.json({ error: '해당 세션의 결과를 찾을 수 없습니다.' }, { status: 404 });
      }

      const result = results[0];
      feedbackData = {
        testType,
        question: result.question || '테스트 문항',
        studentAnswer: result.student_answer || '학생 답변',
        isCorrect: result.is_correct || false,
        errorType: result.error_type || null
      };
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

    // 실시간 피드백 생성
    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an encouraging EFL teacher providing real-time feedback for DIBELS assessments. 
          
          CONTEXT: ${feedbackData.testType} test
          QUESTION: ${feedbackData.question}
          STUDENT ANSWER: ${feedbackData.studentAnswer}
          RESULT: ${feedbackData.isCorrect ? 'Correct' : 'Incorrect'}
          ERROR TYPE: ${feedbackData.errorType || 'None'}
          
          GUIDELINES:
          1. Be encouraging and supportive
          2. Provide specific, actionable feedback
          3. Use simple Korean when appropriate
          4. Keep feedback brief (1-2 sentences)
          5. Focus on what the student did well
          6. If incorrect, gently guide toward the correct answer
          
          Respond with JSON: {"feedback": "encouraging message", "tip": "helpful tip"}`
        }
      ],
      response_format: { type: 'json_object' },
    });

    const aiFeedback = JSON.parse(feedbackResponse.choices[0].message.content || '{}');
    
    return NextResponse.json({
      feedback: aiFeedback.feedback || "좋은 시도입니다!",
      tip: aiFeedback.tip || "계속 노력해보세요!"
    });

  } catch (error) {
    console.error('피드백 생성 에러:', error);
    return NextResponse.json({ 
      feedback: "좋은 시도입니다!",
      tip: "계속 노력해보세요!"
    });
  }
}
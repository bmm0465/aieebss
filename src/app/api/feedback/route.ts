import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { testType, question, studentAnswer, isCorrect, errorType } = await request.json();

    if (!testType || !question || !studentAnswer) {
      return NextResponse.json({ error: '필수 데이터가 누락되었습니다.' }, { status: 400 });
    }

    // 실시간 피드백 생성
    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an encouraging EFL teacher providing real-time feedback for DIBELS assessments. 
          
          CONTEXT: ${testType} test
          QUESTION: ${question}
          STUDENT ANSWER: ${studentAnswer}
          RESULT: ${isCorrect ? 'Correct' : 'Incorrect'}
          ERROR TYPE: ${errorType || 'None'}
          
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

    const feedbackData = JSON.parse(feedbackResponse.choices[0].message.content || '{}');
    
    return NextResponse.json({
      feedback: feedbackData.feedback || "좋은 시도입니다!",
      tip: feedbackData.tip || "계속 노력해보세요!"
    });

  } catch (error) {
    console.error('피드백 생성 에러:', error);
    return NextResponse.json({ 
      feedback: "좋은 시도입니다!",
      tip: "계속 노력해보세요!"
    });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase 테이블 타입 정의
type TestResult = {
  id: string;
  user_id: string;
  test_type: string;
  question_word?: string;
  student_answer?: string;
  is_correct?: boolean;
  correct_segments?: number;
  target_segments?: number;
  is_phonemes_correct?: boolean;
  is_whole_word_correct?: boolean;
  wcpm?: number;
  accuracy?: number;
  question_passage?: string;
  created_at?: string;
};

// LNF 결과 분석 함수
function analyzeLNFResults(results: TestResult[]) {
  const lnfResults = results.filter(r => r.test_type === 'LNF');
  
  if (lnfResults.length === 0) {
    return null;
  }

  const total = lnfResults.length;
  const correct = lnfResults.filter(r => r.is_correct).length;
  const accuracy = (correct / total) * 100;
  
  // 틀린 답변 분석
  const incorrectAnswers = lnfResults
    .filter(r => !r.is_correct && r.question_word && r.student_answer)
    .map(r => ({
      question: r.question_word!,
      studentAnswer: r.student_answer!,
      isCorrect: r.is_correct!
    }));

  // 자주 틀리는 글자 패턴 분석
  const errorPatterns = analyzeErrorPatterns(incorrectAnswers);
  
  return {
    total,
    correct,
    accuracy,
    incorrectAnswers,
    errorPatterns
  };
}

// PSF 결과 분석 함수
function analyzePSFResults(results: TestResult[]) {
  const psfResults = results.filter(r => r.test_type === 'PSF');
  
  if (psfResults.length === 0) {
    return null;
  }

  const total = psfResults.length;
  const correct = psfResults.filter(r => r.is_phonemes_correct).length;
  const accuracy = (correct / total) * 100;
  
  const incorrectAnswers = psfResults
    .filter(r => !r.is_phonemes_correct && r.question_word && r.student_answer)
    .map(r => ({
      question: r.question_word!,
      studentAnswer: r.student_answer!,
      isCorrect: r.is_phonemes_correct!
    }));
  
  return {
    total,
    correct,
    accuracy,
    incorrectAnswers,
    errorPatterns: { similarShapes: [], caseConfusion: [], uncommonLetters: [], other: [] }
  };
}

// NWF 결과 분석 함수
function analyzeNWFResults(results: TestResult[]) {
  const nwfResults = results.filter(r => r.test_type === 'NWF');
  
  if (nwfResults.length === 0) {
    return null;
  }

  const total = nwfResults.length;
  const correct = nwfResults.filter(r => r.is_whole_word_correct).length;
  const accuracy = (correct / total) * 100;
  
  const incorrectAnswers = nwfResults
    .filter(r => !r.is_whole_word_correct && r.question_word && r.student_answer)
    .map(r => ({
      question: r.question_word!,
      studentAnswer: r.student_answer!,
      isCorrect: r.is_whole_word_correct!
    }));
  
  return {
    total,
    correct,
    accuracy,
    incorrectAnswers,
    errorPatterns: { similarShapes: [], caseConfusion: [], uncommonLetters: [], other: [] }
  };
}

// WRF 결과 분석 함수
function analyzeWRFResults(results: TestResult[]) {
  const wrfResults = results.filter(r => r.test_type === 'WRF');
  
  if (wrfResults.length === 0) {
    return null;
  }

  const total = wrfResults.length;
  const correct = wrfResults.filter(r => r.is_correct).length;
  const accuracy = (correct / total) * 100;
  
  const incorrectAnswers = wrfResults
    .filter(r => !r.is_correct && r.question_word && r.student_answer)
    .map(r => ({
      question: r.question_word!,
      studentAnswer: r.student_answer!,
      isCorrect: r.is_correct!
    }));
  
  return {
    total,
    correct,
    accuracy,
    incorrectAnswers,
    errorPatterns: { similarShapes: [], caseConfusion: [], uncommonLetters: [], other: [] }
  };
}

// ORF 결과 분석 함수
function analyzeORFResults(results: TestResult[]) {
  const orfResults = results.filter(r => r.test_type === 'ORF');
  
  if (orfResults.length === 0) {
    return null;
  }

  const total = orfResults.length;
  const avgWcpm = orfResults.reduce((sum, r) => sum + (r.wcpm || 0), 0) / total;
  const avgAccuracy = orfResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / total;
  
  return {
    total,
    correct: Math.round(avgAccuracy * total / 100),
    accuracy: avgAccuracy,
    incorrectAnswers: [],
    errorPatterns: { similarShapes: [], caseConfusion: [], uncommonLetters: [], other: [] },
    avgWcpm
  };
}

// MAZE 결과 분석 함수
function analyzeMAZEResults(results: TestResult[]) {
  const mazeResults = results.filter(r => r.test_type === 'MAZE');
  
  if (mazeResults.length === 0) {
    return null;
  }

  const total = mazeResults.length;
  const correct = mazeResults.filter(r => r.is_correct).length;
  const accuracy = (correct / total) * 100;
  
  const incorrectAnswers = mazeResults
    .filter(r => !r.is_correct && r.question_word && r.student_answer)
    .map(r => ({
      question: r.question_word!,
      studentAnswer: r.student_answer!,
      isCorrect: r.is_correct!
    }));
  
  return {
    total,
    correct,
    accuracy,
    incorrectAnswers,
    errorPatterns: { similarShapes: [], caseConfusion: [], uncommonLetters: [], other: [] }
  };
}

// 오류 패턴 분석 함수
function analyzeErrorPatterns(incorrectAnswers: Array<{
  question: string;
  studentAnswer: string;
  isCorrect: boolean;
}>) {
  const patterns: {
    similarShapes: Array<{ question: string; studentAnswer: string }>;
    caseConfusion: Array<{ question: string; studentAnswer: string }>;
    uncommonLetters: Array<{ question: string; studentAnswer: string }>;
    other: Array<{ question: string; studentAnswer: string }>;
  } = {
    similarShapes: [], // 비슷한 모양의 글자 (b/d, p/q 등)
    caseConfusion: [], // 대소문자 혼동
    uncommonLetters: [], // 자주 보지 못하는 글자
    other: []
  };

  incorrectAnswers.forEach(answer => {
    const question = answer.question;
    const studentAnswer = answer.studentAnswer;
    
    if (!question || !studentAnswer) return;

    // 비슷한 모양의 글자들
    const similarPairs = [
      ['b', 'd'], ['p', 'q'], ['n', 'u'], ['m', 'w'],
      ['B', 'D'], ['P', 'Q'], ['N', 'U'], ['M', 'W']
    ];
    
    for (const [letter1, letter2] of similarPairs) {
      if ((question === letter1 && studentAnswer === letter2) || 
          (question === letter2 && studentAnswer === letter1)) {
        patterns.similarShapes.push({ question, studentAnswer });
        return;
      }
    }

    // 대소문자 혼동
    if (question.toLowerCase() === studentAnswer.toLowerCase() && 
        question !== studentAnswer) {
      patterns.caseConfusion.push({ question, studentAnswer });
      return;
    }

    // 자주 보지 못하는 글자들
    const uncommonLetters = ['Q', 'X', 'Z', 'J', 'K', 'V', 'Y'];
    if (uncommonLetters.includes(question)) {
      patterns.uncommonLetters.push({ question, studentAnswer });
      return;
    }

    patterns.other.push({ question, studentAnswer });
  });

  return patterns;
}

// OpenAI API를 통한 피드백 생성
async function generateFeedback(testType: string, analysis: {
  total: number;
  correct: number;
  accuracy: number;
  incorrectAnswers: Array<{
    question: string;
    studentAnswer: string;
    isCorrect: boolean;
  }>;
  errorPatterns: {
    similarShapes: Array<{ question: string; studentAnswer: string }>;
    caseConfusion: Array<{ question: string; studentAnswer: string }>;
    uncommonLetters: Array<{ question: string; studentAnswer: string }>;
    other: Array<{ question: string; studentAnswer: string }>;
  };
}) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not found');
  }

  let prompt = '';
  
  if (testType === 'LNF') {
    prompt = `당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th LNF(Letter Naming Fluency) 평가 결과를 바탕으로 Hattie의 피드백 개념을 적용한 개인화된 피드백을 제공해주세요.

학생의 LNF 평가 결과:
- 총 문제 수: ${analysis.total}개
- 정답 수: ${analysis.correct}개  
- 정확도: ${analysis.accuracy.toFixed(1)}%

오류 패턴 분석:
- 비슷한 모양 글자 혼동: ${analysis.errorPatterns.similarShapes.length}개
- 대소문자 혼동: ${analysis.errorPatterns.caseConfusion.length}개
- 자주 보지 못하는 글자: ${analysis.errorPatterns.uncommonLetters.length}개
- 기타: ${analysis.errorPatterns.other.length}개

구체적인 오류 예시:
${analysis.incorrectAnswers.slice(0, 5).map(a => `- 문제: ${a.question}, 학생 답: ${a.studentAnswer}`).join('\n')}

Hattie의 피드백 개념에 따라 다음 세 가지 질문에 답하는 피드백을 제공해주세요:

1. "나는 어디로 가고 있는가?" (Feed Up): LNF 학습 목표와 기준을 명확히 설명
2. "나는 지금 잘하고 있는가?" (Feed Back): 현재 수행 능력과 목표 사이의 차이를 구체적으로 설명
3. "다음에는 무엇을 해야 하는가?" (Feed Forward): 목표 달성을 위한 구체적인 다음 단계와 전략 제시

피드백은 다음 원칙을 따라주세요:
- 과제 수준, 과정 수준, 자기 조절 수준에 초점
- 개인화된 구체적인 예시 포함
- 긍정적이면서도 건설적인 톤
- 실행 가능한 구체적인 전략 제시
- 한국어로 작성
- 초등학생이 이해하기 쉬운 언어 사용

응답 형식:
{
  "feedUp": "목표 설정 내용",
  "feedBack": "현재 상태 평가 내용", 
  "feedForward": "향후 학습 전략 내용"
}`;
  } else if (testType === 'PSF') {
    prompt = `당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th PSF(Phoneme Segmentation Fluency) 평가 결과를 바탕으로 개인화된 피드백을 제공해주세요.

학생의 PSF 평가 결과:
- 총 문제 수: ${analysis.total}개
- 정답 수: ${analysis.correct}개  
- 정확도: ${analysis.accuracy.toFixed(1)}%

응답 형식:
{
  "feedUp": "PSF 학습 목표 설명",
  "feedBack": "현재 음소 분리 능력 평가", 
  "feedForward": "음소 분리 능력 향상 전략"
}`;
  } else if (testType === 'NWF') {
    prompt = `당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th NWF(Nonsense Word Fluency) 평가 결과를 바탕으로 개인화된 피드백을 제공해주세요.

학생의 NWF 평가 결과:
- 총 문제 수: ${analysis.total}개
- 정답 수: ${analysis.correct}개  
- 정확도: ${analysis.accuracy.toFixed(1)}%

응답 형식:
{
  "feedUp": "NWF 학습 목표 설명",
  "feedBack": "현재 파닉스 능력 평가", 
  "feedForward": "파닉스 능력 향상 전략"
}`;
  } else if (testType === 'WRF') {
    prompt = `당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th WRF(Word Reading Fluency) 평가 결과를 바탕으로 개인화된 피드백을 제공해주세요.

학생의 WRF 평가 결과:
- 총 문제 수: ${analysis.total}개
- 정답 수: ${analysis.correct}개  
- 정확도: ${analysis.accuracy.toFixed(1)}%

응답 형식:
{
  "feedUp": "WRF 학습 목표 설명",
  "feedBack": "현재 단어 읽기 능력 평가", 
  "feedForward": "단어 읽기 능력 향상 전략"
}`;
  } else if (testType === 'ORF') {
    prompt = `당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th ORF(Oral Reading Fluency) 평가 결과를 바탕으로 개인화된 피드백을 제공해주세요.

학생의 ORF 평가 결과:
- 평가 횟수: ${analysis.total}회
- 평균 정확도: ${analysis.accuracy.toFixed(1)}%
- 평균 WCPM: ${(analysis as any).avgWcpm?.toFixed(1) || '데이터 없음'}

응답 형식:
{
  "feedUp": "ORF 학습 목표 설명",
  "feedBack": "현재 낭독 유창성 평가", 
  "feedForward": "낭독 유창성 향상 전략"
}`;
  } else if (testType === 'MAZE') {
    prompt = `당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th MAZE 평가 결과를 바탕으로 개인화된 피드백을 제공해주세요.

학생의 MAZE 평가 결과:
- 총 문제 수: ${analysis.total}개
- 정답 수: ${analysis.correct}개  
- 정확도: ${analysis.accuracy.toFixed(1)}%

응답 형식:
{
  "feedUp": "MAZE 학습 목표 설명",
  "feedBack": "현재 독해 능력 평가", 
  "feedForward": "독해 능력 향상 전략"
    }`;
  } else {
    throw new Error(`지원하지 않는 테스트 타입: ${testType}`);
  }

  if (!prompt) {
    throw new Error('프롬프트 생성에 실패했습니다.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '당신은 초등학교 읽기 교육 전문가입니다. DIBELS 8th 평가 결과를 바탕으로 Hattie의 피드백 개념을 적용한 개인화된 피드백을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // JSON 파싱 시도
    try {
      return JSON.parse(content);
    } catch {
      // JSON 파싱 실패 시 기본 구조로 반환
      return {
        feedUp: "LNF 학습 목표를 달성하기 위해 노력하고 있습니다.",
        feedBack: content,
        feedForward: "계속해서 연습을 통해 실력을 향상시켜 나가세요."
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType, sessionId } = await request.json();

    if (!testType || !sessionId) {
      return NextResponse.json(
        { error: 'testType과 sessionId가 필요합니다.' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = await createClient();
    
    // 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 세션 ID에서 날짜 추출
    const [dateStr] = sessionId.split('_');
    const sessionDate = new Date(dateStr);
    
    // 해당 날짜의 결과 조회
    const { data: results, error: resultsError } = await supabase
      .from('test_results')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', sessionDate.toISOString().split('T')[0])
      .lt('created_at', new Date(sessionDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('created_at', { ascending: true });

    if (resultsError) {
      console.error('결과 조회 에러:', resultsError);
      return NextResponse.json(
        { error: '결과를 조회하는 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: '해당 세션의 결과를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 세션별 필터링 (30분 간격)
    const sessionNumber = parseInt(sessionId.split('_')[1] || '0');
    const sessionGroups: TestResult[][] = [];
    let currentGroup: TestResult[] = [];
    let lastTime = 0;

    results.forEach(result => {
      const resultTime = new Date(result.created_at || 0).getTime();
      
      if (resultTime - lastTime > 1800000 && currentGroup.length > 0) {
        sessionGroups.push(currentGroup);
        currentGroup = [];
      }
      
      currentGroup.push(result);
      lastTime = resultTime;
    });
    
    if (currentGroup.length > 0) {
      sessionGroups.push(currentGroup);
    }

    const sessionResults = sessionGroups[sessionNumber] || [];

    if (sessionResults.length === 0) {
      return NextResponse.json(
        { error: '해당 세션의 결과를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 테스트 타입별 분석
    let analysis = null;
    if (testType === 'LNF') {
      analysis = analyzeLNFResults(sessionResults);
    } else if (testType === 'PSF') {
      analysis = analyzePSFResults(sessionResults);
    } else if (testType === 'NWF') {
      analysis = analyzeNWFResults(sessionResults);
    } else if (testType === 'WRF') {
      analysis = analyzeWRFResults(sessionResults);
    } else if (testType === 'ORF') {
      analysis = analyzeORFResults(sessionResults);
    } else if (testType === 'MAZE') {
      analysis = analyzeMAZEResults(sessionResults);
    }

    if (!analysis) {
      return NextResponse.json(
        { error: `해당 테스트 타입(${testType})의 결과를 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    // LLM을 통한 피드백 생성
    const feedback = await generateFeedback(testType, analysis);

    return NextResponse.json({
      testType,
      analysis,
      feedback
    });

  } catch (error) {
    console.error('피드백 생성 에러:', error);
    return NextResponse.json(
      { error: '피드백을 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

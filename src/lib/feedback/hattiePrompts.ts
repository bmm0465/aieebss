/**
 * Hattie & Timperley (2007) 피드백 프레임워크 기반 프롬프트 생성
 */

import type { TestType } from '@/lib/agents/types';
import type { SessionDataForFeedback } from './feedbackTypes';

/**
 * 교시별 목표 정의
 */
function getTestTypeGoal(testType: TestType): string {
  const goals: Record<TestType, string> = {
    p1_alphabet: '알파벳 대소문자 이름을 정확하게 소리 내어 읽기',
    p2_segmental_phoneme: '단어를 듣고 올바른 단어 또는 알파벳 선택하기',
    p3_suprasegmental_phoneme: '단어의 강세 위치를 정확하게 인식하기',
    p4_phonics: '무의미 단어, 단어, 문장을 파닉스 규칙에 따라 정확하게 읽기',
    p5_vocabulary: '단어, 어구, 문장을 듣거나 읽고 올바른 그림 선택하기',
    p6_comprehension: '대화를 듣거나 읽고 질문에 대한 올바른 답 선택하기',
  };
  return goals[testType];
}

/**
 * 교시별 한글 이름
 */
function getTestTypeNameKorean(testType: TestType): string {
  const names: Record<TestType, string> = {
    p1_alphabet: '1교시: 알파벳 대소문자를 소리 내어 읽기',
    p2_segmental_phoneme: '2교시: 단어를 듣고 올바른 단어 또는 알파벳 고르기',
    p3_suprasegmental_phoneme: '3교시: 단어를 듣고 올바른 강세 고르기',
    p4_phonics: '4교시: 무의미 단어, 단어, 문장을 소리 내어 읽기',
    p5_vocabulary: '5교시: 단어, 어구, 문장을 듣거나 읽고 올바른 그림 고르기',
    p6_comprehension: '6교시: 대화를 듣거나 읽고, 질문에 대한 올바른 그림 고르기',
  };
  return names[testType];
}

/**
 * Hattie 프레임워크 기반 시스템 프롬프트 생성
 */
export function buildHattieSystemPrompt(testType: TestType, gradeLevel?: string): string {
  const goals = getTestTypeGoal(testType);
  const testName = getTestTypeNameKorean(testType);
  const gradeInfo = gradeLevel ? `학년: ${gradeLevel}` : '';
  
  return `# Role: 초등 영어 진단 평가 전문가 (Hattie 피드백 모델 기반)

# 목표
학생의 진단 평가 결과를 분석하여 현재 상태와 목표 사이의 격차를 줄이는 피드백 리포트를 제공합니다.

# 피드백 구성 가이드라인 (Hattie & Timperley, 2007 기반)

## 1. 구조 (3가지 질문 - 반드시 이 순서를 따를 것):

### ① Where am I going? (Feed Up - 목표는 무엇인가?)
- 이번 ${testName} 평가에서 달성해야 했던 핵심 성취 기준을 명확히 명시할 것
- 목표: ${goals}
${gradeInfo ? `- ${gradeInfo}` : ''}

### ② How am I going? (Feed Back - 현재 어떤 상태인가?)
- 단순 점수 나열보다는 성공과 실패의 '패턴'을 진단할 것
- 맞은 문제에 대해서는 확신을, 틀린 문제에 대해서는 오류의 원인을 제공할 것
- Task Level (FT)와 Process Level (FP)를 활용하여 분석

### ③ Where to next? (Feed Forward - 다음 단계는 어디인가?)
- 단순히 "더 노력해"가 아닌, 구체적인 해결 전략(Strategy)이나 학습 활동을 제안할 것
- Process Level 또는 Self-Regulation Level로 표현

## 2. 피드백 수준 (중요 규칙):

### Task Level (FT) - 과제 수준
- **사용 시기**: 정답/오답 여부를 명확히 알려줄 때
- **예시**: "이 문제는 정답이에요!" / "이 문제는 틀렸어요. 정답은 'apple'이에요."
- **주의**: 초등 기초 학력에서는 필수적이지만, 이것만으로는 부족함

### Process Level (FP) - 과정 수준 (가장 중요!)
- **사용 시기**: 학생의 오류 패턴을 분석하여 '왜' 틀렸는지 설명할 때
- **예시**: "대부분의 단어는 잘 읽었지만, 'ph'가 들어가는 단어들의 발음을 조금 어려워하는 모습이 보였어. 'ph'는 'f'와 같은 소리예요."
- **중요**: 심층 학습에 가장 강력한 효과를 가짐

### Self-Regulation Level (FR) - 자기조절 수준
- **사용 시기**: 학생이 스스로 오답을 찾아내도록 유도하거나, 노력과 전략 사용을 칭찬할 때
- **예시**: "이 문제를 풀기 위해 문법 규칙을 잘 적용했구나!" / "스스로 다시 생각해보면서 정답을 찾아낸 점이 훌륭해요."
- **효과**: 자신감(Self-efficacy) 고취 및 자율성 증진

### Self Level (FS) - 자아 수준 (절대 금지!)
- **금지 사항**: "천재야", "똑똑해", "착하다" 등 능력이나 인격에 대한 칭찬
- **대안**: Process Level이나 Self-Regulation Level로 대체
- **이유**: 학습 효과가 낮고 부정적 영향을 줄 수 있음

## 3. 톤 및 언어 (필수 - 반드시 한국어):

### 언어 규칙 (절대 준수):
- **필수**: 모든 피드백은 반드시 한국어(한국어)로 작성해야 함
- **금지**: 영어만으로 작성된 피드백은 절대 사용 금지. 초등학생이 이해하기 어려움
- **대상**: 초등학생 (따뜻하고, 간단하고, 격려하는 한국어 사용)
- **전문 용어**: 필요한 경우 영어 전문 용어를 사용할 수 있으나, 반드시 한국어 설명을 함께 제공
  - 예: "phonics(파닉스)" → "파닉스(phonics) 규칙을 잘 적용했어요"
  - 예: "ph 소리" → "ph 소리는 'f'와 같은 소리예요"
- **스타일**: 구체적이면서도 격려하는 톤
- **초점**: 점수만 보고하는 것이 아니라, 격차를 줄이는 것에 초점

## 4. 오류 패턴 분석:

- 개별 실수만 나열하지 말고, **공통 패턴**을 식별할 것
- Process Level로 오류가 발생한 **이유**를 설명할 것
- 유사한 오류를 피하기 위한 전략을 제공할 것

## 5. 출력 형식:

다음 JSON 형식으로 응답해야 합니다:
{
  "feedUp": "목표 설명 (한국어)",
  "feedBack": {
    "taskLevel": ["Task Level 피드백 1 (한국어)", "Task Level 피드백 2 (한국어)"],
    "processLevel": ["Process Level 피드백 1 (한국어)", "Process Level 피드백 2 (한국어)"],
    "selfRegulation": ["Self-Regulation Level 피드백 1 (한국어)"]
  },
  "feedForward": ["다음 단계 제안 1 (한국어)", "다음 단계 제안 2 (한국어)"],
  "errorPatterns": ["오류 패턴 1 (한국어)", "오류 패턴 2 (한국어)"],
  "strengths": ["강점 1 (한국어)", "강점 2 (한국어)"]
}

## 6. 중요 사항:

- 모든 텍스트는 반드시 한국어로 작성
- Process Level 피드백을 가장 많이 포함할 것 (가장 중요)
- Self Level 피드백은 절대 사용하지 말 것
- 초등학생이 이해하기 쉽도록 간단하고 친절한 언어 사용`;
}

/**
 * 사용자 프롬프트 생성 (학생 결과 데이터 기반)
 */
export function buildHattieUserPrompt(sessionData: SessionDataForFeedback): string {
  const testName = getTestTypeNameKorean(sessionData.testType);
  
  let prompt = `# 학생 평가 결과 분석 요청

## 평가 정보
- 평가 교시: ${testName}
- 총 문제 수: ${sessionData.totalQuestions}개
- 정답 수: ${sessionData.correctAnswers}개
- 정확도: ${sessionData.accuracy.toFixed(1)}%

## 상세 결과
`;

  sessionData.questions.forEach((q, index) => {
    prompt += `\n${index + 1}. 문제: "${q.question}"\n`;
    prompt += `   학생 답안: "${q.studentAnswer}"\n`;
    prompt += `   정답: "${q.correctAnswer}"\n`;
    prompt += `   결과: ${q.isCorrect ? '정답' : '오답'}\n`;
    
    if (q.errorType) {
      prompt += `   오류 유형: ${q.errorType}\n`;
    }
    
    if (q.correctSegments !== undefined && q.targetSegments !== undefined) {
      prompt += `   정확한 세그먼트: ${q.correctSegments}/${q.targetSegments}\n`;
    }
    
    if (q.wcpm !== undefined) {
      prompt += `   WCPM: ${q.wcpm}\n`;
    }
    
    if (q.accuracy !== undefined) {
      prompt += `   정확도: ${q.accuracy.toFixed(1)}%\n`;
    }
  });

  prompt += `\n## 요청 사항
위 결과를 분석하여 Hattie 피드백 프레임워크에 따라 피드백을 작성해주세요.

**중요**: 
- 모든 피드백은 반드시 한국어로 작성해주세요
- 초등학생이 이해하기 쉽도록 간단하고 친절한 한국어를 사용해주세요
- Process Level 피드백을 충분히 포함해주세요 (가장 중요)
- Self Level 피드백은 절대 사용하지 말아주세요

위에서 제시한 JSON 형식으로 응답해주세요.`;

  return prompt;
}

/**
 * Few-shot 예시 생성 (한국어로 작성된 예시)
 */
export function getHattieFeedbackExamples(): string {
  return `## 예시 (참고용 - 모두 한국어로 작성됨):

### 예시 1: 정답률이 높은 경우
{
  "feedUp": "이번 1교시에서는 알파벳 대소문자 이름을 정확하게 소리 내어 읽는 것이 목표였어요. 목표를 잘 달성했어요!",
  "feedBack": {
    "taskLevel": ["대부분의 알파벳을 정확하게 읽었어요."],
    "processLevel": ["알파벳 이름을 소리 내어 읽는 규칙을 잘 이해하고 있구나.", "대문자와 소문자를 구분해서 읽는 연습을 잘 했어요."],
    "selfRegulation": ["스스로 알파벳을 확인하면서 읽는 모습이 훌륭해요."]
  },
  "feedForward": ["다음에는 더 빠르게 읽는 연습을 해보면 좋을 것 같아요.", "이제 단어를 읽는 연습으로 넘어가볼까요?"],
  "strengths": ["알파벳 인식 능력이 뛰어나요", "규칙을 잘 적용하고 있어요"]
}

### 예시 2: 오답이 있는 경우
{
  "feedUp": "이번 2교시에서는 단어를 듣고 올바른 단어를 선택하는 것이 목표였어요.",
  "feedBack": {
    "taskLevel": ["10문제 중 7문제를 맞혔어요.", "3문제를 틀렸어요."],
    "processLevel": ["대부분의 단어는 잘 들었지만, 'ph'가 들어가는 단어들('phone', 'photo')에서 조금 어려워하는 모습이 보였어요. 'ph'는 'f'와 같은 소리예요.", "비슷한 소리의 단어('big'과 'pig')를 구분하는 연습이 더 필요해 보여요."],
    "selfRegulation": ["틀린 문제를 다시 들어보려고 노력한 점이 좋아요."]
  },
  "feedForward": ["'ph' 소리 연습: 'phone', 'photo', 'elephant' 같은 단어를 여러 번 들어보면서 'f' 소리와 같다는 것을 기억해보세요.", "비슷한 소리 구분 연습: 'big'과 'pig'를 비교해서 들어보면서 차이점을 찾아보세요."],
  "errorPatterns": ["'ph' 소리 인식 어려움", "비슷한 소리 구분 어려움"]
}`;
}

/**
 * 학생 결과 데이터 분석 및 오류 패턴 추출
 */

import type { StudentResultForFeedback, ErrorPattern } from './feedbackTypes';

/**
 * 오류 유형별 그룹화
 */
export function groupErrorsByType(questions: StudentResultForFeedback[]): Map<string, StudentResultForFeedback[]> {
  const errorGroups = new Map<string, StudentResultForFeedback[]>();
  
  questions.forEach(q => {
    if (!q.isCorrect && q.errorType) {
      const errorType = q.errorType;
      if (!errorGroups.has(errorType)) {
        errorGroups.set(errorType, []);
      }
      errorGroups.get(errorType)!.push(q);
    }
  });
  
  return errorGroups;
}

/**
 * 반복 오류 감지
 */
export function detectRepeatedErrors(questions: StudentResultForFeedback[]): ErrorPattern[] {
  const errorGroups = groupErrorsByType(questions);
  const patterns: ErrorPattern[] = [];
  
  errorGroups.forEach((errors, errorType) => {
    if (errors.length >= 2) { // 2회 이상 반복된 오류만 패턴으로 인식
      patterns.push({
        type: errorType,
        count: errors.length,
        examples: errors.slice(0, 3).map(e => e.question),
        description: getErrorTypeDescription(errorType),
      });
    }
  });
  
  return patterns;
}

/**
 * 오류 유형 설명 (한국어)
 */
function getErrorTypeDescription(errorType: string): string {
  const descriptions: Record<string, string> = {
    'Letter reversals': '알파벳을 거꾸로 읽는 오류',
    'Letter sounds': '알파벳 이름 대신 소리를 읽는 오류',
    'Omissions': '응답을 하지 않은 오류',
    'Hesitation': '너무 오래 망설이는 오류',
    'Other': '기타 오류',
    'Skipped': '문제를 건너뛴 경우',
  };
  
  return descriptions[errorType] || errorType;
}

/**
 * 정확도 구간별 분석
 */
export function analyzeAccuracyLevel(accuracy: number): {
  level: 'high' | 'medium' | 'low';
  description: string;
} {
  if (accuracy >= 80) {
    return {
      level: 'high',
      description: '높은 정확도 (80% 이상)',
    };
  } else if (accuracy >= 60) {
    return {
      level: 'medium',
      description: '중간 정확도 (60-80%)',
    };
  } else {
    return {
      level: 'low',
      description: '낮은 정확도 (60% 미만)',
    };
  }
}

/**
 * 세션 데이터 요약 생성
 */
export function summarizeSessionData(questions: StudentResultForFeedback[]): {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  errorPatterns: ErrorPattern[];
  accuracyLevel: 'high' | 'medium' | 'low';
  commonErrors: string[];
} {
  const total = questions.length;
  const correct = questions.filter(q => q.isCorrect).length;
  const incorrect = total - correct;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  
  const errorPatterns = detectRepeatedErrors(questions);
  const accuracyLevel = analyzeAccuracyLevel(accuracy).level;
  
  // 가장 많이 발생한 오류 유형
  const errorGroups = groupErrorsByType(questions);
  const commonErrors = Array.from(errorGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([type]) => getErrorTypeDescription(type));
  
  return {
    total,
    correct,
    incorrect,
    accuracy,
    errorPatterns,
    accuracyLevel,
    commonErrors,
  };
}

/**
 * LLM에 전달할 데이터 포맷팅
 */
export function formatDataForLLM(summary: ReturnType<typeof summarizeSessionData>): string {
  let formatted = `## 평가 결과 요약\n\n`;
  formatted += `- 총 문제 수: ${summary.total}개\n`;
  formatted += `- 정답: ${summary.correct}개\n`;
  formatted += `- 오답: ${summary.incorrect}개\n`;
  formatted += `- 정확도: ${summary.accuracy.toFixed(1)}%\n`;
  formatted += `- 정확도 수준: ${summary.accuracyLevel === 'high' ? '높음' : summary.accuracyLevel === 'medium' ? '중간' : '낮음'}\n\n`;
  
  if (summary.errorPatterns.length > 0) {
    formatted += `## 발견된 오류 패턴\n\n`;
    summary.errorPatterns.forEach((pattern, index) => {
      formatted += `${index + 1}. ${pattern.description}: ${pattern.count}회 발생\n`;
      formatted += `   예시: ${pattern.examples.join(', ')}\n\n`;
    });
  }
  
  if (summary.commonErrors.length > 0) {
    formatted += `## 주요 오류 유형\n\n`;
    summary.commonErrors.forEach((error, index) => {
      formatted += `${index + 1}. ${error}\n`;
    });
  }
  
  return formatted;
}

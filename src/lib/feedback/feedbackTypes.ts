/**
 * Hattie 피드백 프레임워크 타입 정의
 */

import type { TestType } from '@/lib/agents/types';

/**
 * Hattie 피드백 응답 구조
 */
export interface HattieFeedbackResponse {
  feedUp: string;           // 목표는 무엇인가? (한국어)
  feedBack: {
    taskLevel: string[];    // Task Level 피드백 (한국어)
    processLevel: string[]; // Process Level 피드백 (가장 중요, 한국어)
    selfRegulation: string[]; // Self-Regulation Level 피드백 (한국어)
  };
  feedForward: string[];   // 다음 단계는 어디인가? (한국어)
  errorPatterns?: string[]; // 발견된 오류 패턴 (한국어)
  strengths?: string[];     // 강점 (Process Level로 표현, 한국어)
}

/**
 * 학생 결과 데이터 구조 (피드백 생성용)
 */
export interface StudentResultForFeedback {
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  errorType?: string | null;
  correctSegments?: number;
  targetSegments?: number;
  wcpm?: number;
  accuracy?: number;
  timeTaken?: number | null;
}

/**
 * 세션 데이터 구조 (교시별 피드백용)
 */
export interface SessionDataForFeedback {
  testType: TestType;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  questions: StudentResultForFeedback[];
  gradeLevel?: string;
}

/**
 * 오류 패턴 분석 결과
 */
export interface ErrorPattern {
  type: string;           // 오류 유형
  count: number;          // 발생 횟수
  examples: string[];     // 예시
  description: string;     // 설명 (한국어)
}

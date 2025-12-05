/**
 * 성취기준 도달 판정 시스템
 * 혼합 방식: 절대 기준 + 통계적 방법
 */

export type TestType = 
  | 'p1_alphabet'
  | 'p2_segmental_phoneme'
  | 'p3_suprasegmental_phoneme'
  | 'p4_phonics'
  | 'p5_vocabulary'
  | 'p6_comprehension';

/**
 * 절대 기준 (각 영역별 최소 기준점)
 */
export const ABSOLUTE_THRESHOLDS: Record<TestType, number> = {
  p1_alphabet: 70,                    // 알파벳: 70% 이상
  p2_segmental_phoneme: 70,           // 음소 분리: 70% 이상
  p3_suprasegmental_phoneme: 70,     // 강세/리듬: 70% 이상
  p4_phonics: 70,                     // 파닉스: 70% 이상
  p5_vocabulary: 70,                  // 어휘: 70% 이상
  p6_comprehension: 70                // 이해력: 70% 이상
};

/**
 * 통계적 판정 기준 (Z-score)
 * Z-score >= -1.0: 성취기준 도달 (하위 16% 미만 제외)
 */
export const STATISTICAL_THRESHOLD = -1.0;

/**
 * 학생의 평가 결과 데이터
 */
export interface StudentTestResult {
  test_type: TestType;
  accuracy: number;  // 0-100
}

/**
 * 반 통계 데이터
 */
export interface ClassStatistics {
  test_type: TestType;
  mean: number;      // 평균
  stdDev: number;    // 표준편차
  count: number;     // 학생 수
}

/**
 * 성취기준 판정 결과
 */
export interface AchievementResult {
  test_type: TestType;
  student_accuracy: number;
  absolute_threshold: number;
  meets_absolute: boolean;
  class_mean: number | null;
  class_std_dev: number | null;
  z_score: number | null;
  meets_statistical: boolean | null;
  overall_achieved: boolean;  // 절대 기준과 통계적 기준 모두 만족
}

/**
 * 종합 성취기준 판정 결과
 */
export interface OverallAchievementResult {
  results: Record<TestType, AchievementResult>;
  all_achieved: boolean;  // 모든 영역에서 도달
  achieved_count: number; // 도달한 영역 수
  total_count: number;   // 전체 영역 수 (6)
}

/**
 * 평균 계산
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * 표준편차 계산
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Z-score 계산
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0; // 표준편차가 0이면 Z-score는 0
  return (value - mean) / stdDev;
}

/**
 * 반 통계 계산
 * 동일 반 학생들의 평가 결과를 기반으로 평균과 표준편차를 계산
 */
export function calculateClassStatistics(
  testType: TestType,
  classResults: StudentTestResult[]
): ClassStatistics | null {
  const relevantResults = classResults.filter(r => r.test_type === testType);
  
  if (relevantResults.length === 0) {
    return null;
  }

  const accuracies = relevantResults.map(r => r.accuracy);
  const mean = calculateMean(accuracies);
  const stdDev = calculateStdDev(accuracies, mean);

  return {
    test_type: testType,
    mean,
    stdDev,
    count: relevantResults.length
  };
}

/**
 * 단일 영역 성취기준 판정
 */
export function evaluateAchievement(
  testType: TestType,
  studentAccuracy: number,
  classStats: ClassStatistics | null
): AchievementResult {
  const absoluteThreshold = ABSOLUTE_THRESHOLDS[testType];
  const meetsAbsolute = studentAccuracy >= absoluteThreshold;

  let classMean: number | null = null;
  let classStdDev: number | null = null;
  let zScore: number | null = null;
  let meetsStatistical: boolean | null = null;

  if (classStats && classStats.count > 1 && classStats.stdDev > 0) {
    classMean = classStats.mean;
    classStdDev = classStats.stdDev;
    zScore = calculateZScore(studentAccuracy, classMean, classStdDev);
    meetsStatistical = zScore >= STATISTICAL_THRESHOLD;
  }

  // 절대 기준과 통계적 기준을 모두 만족해야 성취기준 도달
  // 통계적 기준이 없는 경우(반 학생이 1명이거나 표준편차가 0인 경우) 절대 기준만으로 판정
  const overallAchieved = meetsAbsolute && (meetsStatistical !== false);

  return {
    test_type: testType,
    student_accuracy: studentAccuracy,
    absolute_threshold: absoluteThreshold,
    meets_absolute: meetsAbsolute,
    class_mean: classMean,
    class_std_dev: classStdDev,
    z_score: zScore,
    meets_statistical: meetsStatistical,
    overall_achieved: overallAchieved
  };
}

/**
 * 모든 영역에 대한 종합 성취기준 판정
 */
export function evaluateOverallAchievement(
  studentResults: StudentTestResult[],
  classResults: StudentTestResult[]
): OverallAchievementResult {
  const results: Record<TestType, AchievementResult> = {} as Record<TestType, AchievementResult>;
  
  // 각 영역별로 판정
  const testTypes: TestType[] = [
    'p1_alphabet',
    'p2_segmental_phoneme',
    'p3_suprasegmental_phoneme',
    'p4_phonics',
    'p5_vocabulary',
    'p6_comprehension'
  ];

  for (const testType of testTypes) {
    const studentResult = studentResults.find(r => r.test_type === testType);
    
    if (!studentResult) {
      // 평가를 받지 않은 영역은 미도달로 처리
      results[testType] = {
        test_type: testType,
        student_accuracy: 0,
        absolute_threshold: ABSOLUTE_THRESHOLDS[testType],
        meets_absolute: false,
        class_mean: null,
        class_std_dev: null,
        z_score: null,
        meets_statistical: null,
        overall_achieved: false
      };
      continue;
    }

    const classStats = calculateClassStatistics(testType, classResults);
    results[testType] = evaluateAchievement(testType, studentResult.accuracy, classStats);
  }

  // 도달한 영역 수 계산
  const achievedCount = Object.values(results).filter(r => r.overall_achieved).length;
  const allAchieved = achievedCount === testTypes.length;

  return {
    results,
    all_achieved: allAchieved,
    achieved_count: achievedCount,
    total_count: testTypes.length
  };
}

/**
 * 영역 이름 한글 변환
 */
export function getTestTypeName(testType: TestType): string {
  const names: Record<TestType, string> = {
    p1_alphabet: '알파벳 이름 말하기',
    p2_segmental_phoneme: '음소 분리',
    p3_suprasegmental_phoneme: '강세 및 리듬 패턴',
    p4_phonics: '파닉스 읽기',
    p5_vocabulary: '의미 이해',
    p6_comprehension: '주요 정보 파악'
  };
  return names[testType];
}

/**
 * 영역 이름 짧은 버전
 */
export function getTestTypeShortName(testType: TestType): string {
  const names: Record<TestType, string> = {
    p1_alphabet: '알파벳',
    p2_segmental_phoneme: '음소 분리',
    p3_suprasegmental_phoneme: '강세/리듬',
    p4_phonics: '파닉스',
    p5_vocabulary: '어휘',
    p6_comprehension: '이해력'
  };
  return names[testType];
}


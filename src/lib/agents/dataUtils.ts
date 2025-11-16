// vocabulary_level.json, core_expressions.json 로드/필터링 유틸

import fs from 'fs';
import path from 'path';
import type { GradeLevel } from './types';

type VocabularyLevelJson = {
  metadata: unknown;
  units: Array<{
    unit: number;
    entries: Array<Record<string, string | number | null>>;
  }>;
};

type CoreExpressionsJson = {
  metadata: unknown;
  units: Array<{
    unit: number;
    entries: Array<Record<string, string | number | null>>;
  }>;
};

/**
 * 프로젝트 루트 기준 data 파일 경로 계산
 */
function resolveDataPath(fileName: string): string {
  // src/lib/agents 기준으로 상위 두 단계에서 data 디렉터리로
  return path.join(process.cwd(), 'data', fileName);
}

/**
 * vocabulary_level.json 전체 로드
 */
function loadVocabularyRaw(): VocabularyLevelJson | null {
  try {
    const filePath = resolveDataPath('vocabulary_level.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as VocabularyLevelJson;
  } catch (error) {
    console.error('vocabulary_level.json 로드 오류:', error);
    return null;
  }
}

/**
 * core_expressions.json 전체 로드
 */
function loadCoreExpressionsRaw(): CoreExpressionsJson | null {
  try {
    const filePath = resolveDataPath('core_expressions.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as CoreExpressionsJson;
  } catch (error) {
    console.error('core_expressions.json 로드 오류:', error);
    return null;
  }
}

/**
 * 학년 수준을 기반으로 대략적인 난이도 범위를 추정하는 헬퍼
 * - 현재는 단순히 모든 유닛을 사용하되, 상위 몇 개만 자르는 방식으로 구현
 * - 향후 GradeLevel별 매핑 로직을 정교화할 수 있음
 */
function getSliceSizeForGrade(gradeLevel: GradeLevel): number {
  switch (gradeLevel) {
    case '초등 1학년':
      return 80;
    case '초등 2학년':
      return 120;
    case '초등 3학년':
      return 160;
    case '초등 4학년':
      return 200;
    case '초등 5학년':
    case '초등 6학년':
      return 240;
    default:
      return 100;
  }
}

/**
 * vocabulary_level.json에서 학년 수준에 맞는 고빈도 단어 후보 추출
 * - 현재는 출판사 구분 없이 모든 텍스트 컬럼에서 단어를 수집하고,
 *   빈도 기반이 아니라 등장 순서를 기준으로 상위 N개만 사용
 */
export function loadVocabularyByLevel(gradeLevel: GradeLevel): string[] {
  const raw = loadVocabularyRaw();
  if (!raw) return [];

  const words: string[] = [];

  for (const unit of raw.units) {
    for (const entry of unit.entries) {
      for (const value of Object.values(entry)) {
        if (typeof value === 'string') {
          // "hello(hi)" / "goodbye/bye" 같은 형태는 토큰으로 분리
          const tokens = value
            .split(/[\/(),]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
          words.push(...tokens);
        }
      }
    }
  }

  // 중복 제거
  const unique = Array.from(new Set(words));

  // 학년 수준에 따른 상위 N개 잘라내기
  const sliceSize = getSliceSizeForGrade(gradeLevel);
  return unique.slice(0, sliceSize);
}

/**
 * core_expressions.json에서 학년 수준에 맞는 핵심 표현 추출
 * - 현재는 모든 유닛의 표현을 평탄화하여 상위 N개 사용
 */
export function loadCoreExpressions(gradeLevel: GradeLevel): string[] {
  const raw = loadCoreExpressionsRaw();
  if (!raw) return [];

  const expressions: string[] = [];

  for (const unit of raw.units) {
    for (const entry of unit.entries) {
      for (const value of Object.values(entry)) {
        if (typeof value === 'string') {
          expressions.push(value.trim());
        }
      }
    }
  }

  const unique = Array.from(new Set(expressions));
  const sliceSize = getSliceSizeForGrade(gradeLevel);
  return unique.slice(0, sliceSize);
}



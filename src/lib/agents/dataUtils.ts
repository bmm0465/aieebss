// vocabulary_level.json, core_expressions.json 로드/필터링 유틸

import fs from 'fs';
import path from 'path';
import type { GradeLevel } from './types';

// 출판사 타입 정의 (JSON 파일의 metadata.publishers와 일치)
export type Publisher = 
  | 'donga_yoon' 
  | 'icecream_park' 
  | 'ybm_kim' 
  | 'ybm_choi' 
  | 'chunjae_text_kim' 
  | 'chunjae_text_ham' 
  | 'chunjae_edu_lee';

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
  // public/data 디렉터리에서 파일 로드
  return path.join(process.cwd(), 'public', 'data', fileName);
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
 * - publisher가 지정되면 해당 출판사의 어휘만 사용
 * - publisher가 없으면 모든 출판사의 어휘를 합쳐서 사용
 */
export function loadVocabularyByLevel(
  gradeLevel: GradeLevel,
  publisher?: Publisher
): string[] {
  const raw = loadVocabularyRaw();
  if (!raw) return [];

  const words: string[] = [];

  for (const unit of raw.units) {
    for (const entry of unit.entries) {
      // 출판사 필터링
      if (publisher) {
        // 지정된 출판사의 값만 사용
        const publisherValue = entry[publisher];
        if (typeof publisherValue === 'string') {
          const tokens = publisherValue
            .split(/[\/(),]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
          words.push(...tokens);
        }
      } else {
        // 모든 출판사의 값 사용 (기존 로직)
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
  }

  // 중복 제거
  const unique = Array.from(new Set(words));

  // 학년 수준에 따른 상위 N개 잘라내기
  const sliceSize = getSliceSizeForGrade(gradeLevel);
  return unique.slice(0, sliceSize);
}

/**
 * core_expressions.json에서 학년 수준에 맞는 핵심 표현 추출
 * - publisher가 지정되면 해당 출판사의 표현만 사용
 * - publisher가 없으면 모든 출판사의 표현을 합쳐서 사용
 */
export function loadCoreExpressions(
  gradeLevel: GradeLevel,
  publisher?: Publisher
): string[] {
  const raw = loadCoreExpressionsRaw();
  if (!raw) return [];

  const expressions: string[] = [];

  for (const unit of raw.units) {
    for (const entry of unit.entries) {
      // 출판사 필터링
      if (publisher) {
        // 지정된 출판사의 값만 사용
        const publisherValue = entry[publisher];
        if (typeof publisherValue === 'string') {
          expressions.push(publisherValue.trim());
        }
      } else {
        // 모든 출판사의 값 사용 (기존 로직)
        for (const value of Object.values(entry)) {
          if (typeof value === 'string') {
            expressions.push(value.trim());
          }
        }
      }
    }
  }

  const unique = Array.from(new Set(expressions));
  const sliceSize = getSliceSizeForGrade(gradeLevel);
  return unique.slice(0, sliceSize);
}



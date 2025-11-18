/**
 * 테스트 문항 로딩 유틸리티
 * DB에서 승인된 문항을 가져오거나, 없으면 기본 문항을 반환
 */

export type TestType = 'LNF' | 'PSF' | 'NWF' | 'WRF' | 'ORF' | 'MAZE';

interface TestItemResponse {
  success: boolean;
  item: {
    id: string;
    testType: string;
    gradeLevel: string;
    items: unknown;
    createdAt: string;
  } | null;
  message?: string;
}

/**
 * 승인된 테스트 문항 조회
 */
export async function fetchApprovedTestItems(
  testType: TestType,
  gradeLevel?: string
): Promise<{ items: unknown; fromDB: boolean } | null> {
  try {
    const params = new URLSearchParams({ testType });
    if (gradeLevel) {
      params.append('gradeLevel', gradeLevel);
    }

    const response = await fetch(`/api/test-items?${params.toString()}`);
    const data: TestItemResponse = await response.json();

    if (data.success && data.item && data.item.items) {
      return {
        items: data.item.items,
        fromDB: true
      };
    }

    // 승인된 문항이 없으면 null 반환 (폴백 사용)
    return null;
  } catch (error) {
    console.error(`[${testType}] 문항 조회 오류:`, error);
    return null;
  }
}

/**
 * 사용자 프로필에서 학년 수준 가져오기
 */
export async function getUserGradeLevel(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/user-profile?userId=${userId}`);
    const data = await response.json();
    return data.gradeLevel || null;
  } catch (error) {
    console.error('학년 수준 조회 오류:', error);
    return null;
  }
}


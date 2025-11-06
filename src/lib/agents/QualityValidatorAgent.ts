// 품질 검증 Agent
// 생성된 문항의 품질을 검증하고 점수를 부여

import OpenAI from 'openai';
import type { TestType, GradeLevel, GeneratedItems, QualityScore } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class QualityValidatorAgent {
  /**
   * 문항 품질 검증
   */
  async validateItems(
    testType: TestType,
    gradeLevel: GradeLevel,
    items: GeneratedItems,
    curriculumContext?: string
  ): Promise<QualityScore> {
    const systemPrompt = this.buildSystemPrompt(testType, gradeLevel);
    const userPrompt = this.buildUserPrompt(testType, items, curriculumContext);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // 검증은 더 정확하게
      });

      const result = JSON.parse(
        completion.choices[0].message.content || '{}'
      ) as {
        overall: number;
        dibels_compliance: number;
        grade_level_appropriateness: number;
        curriculum_alignment: number;
        difficulty_appropriateness: number;
        grammar_accuracy: number;
        issues?: string[];
        suggestions?: string[];
      };

      return {
        overall: result.overall || 0,
        dibels_compliance: result.dibels_compliance || 0,
        grade_level_appropriateness: result.grade_level_appropriateness || 0,
        curriculum_alignment: result.curriculum_alignment || 0,
        difficulty_appropriateness: result.difficulty_appropriateness || 0,
        grammar_accuracy: result.grammar_accuracy || 0,
        issues: result.issues || [],
        suggestions: result.suggestions || []
      };
    } catch (error) {
      console.error('품질 검증 오류:', error);
      // 기본 점수 반환
      return {
        overall: 50,
        dibels_compliance: 50,
        grade_level_appropriateness: 50,
        curriculum_alignment: 50,
        difficulty_appropriateness: 50,
        grammar_accuracy: 50,
        issues: ['품질 검증 중 오류가 발생했습니다.'],
        suggestions: []
      };
    }
  }

  /**
   * 시스템 프롬프트 생성
   */
  private buildSystemPrompt(testType: TestType, gradeLevel: GradeLevel): string {
    const testTypeRequirements = this.getTestTypeRequirements(testType);

    return `당신은 DIBELS 8th Edition 평가 문항의 품질을 검증하는 전문가입니다.

평가 유형: ${testType}
학년 수준: ${gradeLevel}

검증 기준:
1. **DIBELS 8th Edition 준수도** (0-100점)
   - DIBELS 공식 가이드라인에 부합하는가?
   - 문항 수가 정확한가?
   - 문항 형식이 올바른가?

2. **학년 수준 적합성** (0-100점)
   - ${gradeLevel} 수준에 적합한 난이도인가?
   - 학생의 인지 발달 수준을 고려했는가?

3. **교육과정 부합도** (0-100점)
   - 한국 교육과정의 어휘 및 표현을 반영했는가?
   - 교육과정 목표와 일치하는가?

4. **난이도 적절성** (0-100점)
   - 문항 난이도가 적절한가?
   - 너무 쉽거나 어렵지 않은가?

5. **문법 및 표현 정확성** (0-100점)
   - 문법적으로 올바른가?
   - 표현이 자연스러운가?
   - 오타나 오류가 없는가?

${testTypeRequirements}

각 항목에 대해 0-100점을 부여하고, 전체 점수를 계산하세요.
문제점과 개선 제안도 함께 제공하세요.`;
  }

  /**
   * 사용자 프롬프트 생성
   */
  private buildUserPrompt(
    testType: TestType,
    items: GeneratedItems,
    curriculumContext?: string
  ): string {
    const itemsJson = JSON.stringify(items, null, 2);
    const contextInfo = curriculumContext
      ? `\n\n교육과정 컨텍스트:\n${curriculumContext}`
      : '';

    return `검증할 문항:

${itemsJson}

${contextInfo}

다음 JSON 형식으로 검증 결과를 반환하세요:
{
  "overall": 85,
  "dibels_compliance": 90,
  "grade_level_appropriateness": 85,
  "curriculum_alignment": 80,
  "difficulty_appropriateness": 85,
  "grammar_accuracy": 90,
  "issues": ["문항 1개 부족", "일부 단어 난이도 조정 필요"],
  "suggestions": ["문항 수를 보완하세요", "더 쉬운 단어로 변경을 고려하세요"]
}`;
  }

  /**
   * 테스트 유형별 요구사항
   */
  private getTestTypeRequirements(testType: TestType): string {
    const requirements: Record<TestType, string> = {
      'LNF': `- 정확히 200개의 알파벳이 있어야 함
- 대문자 약 40%, 소문자 약 60% 분포
- 무작위 순서로 배열`,
      'PSF': `- 약 100개의 단어
- CVC, CVCC, CCVC 패턴
- 단순한 영어 단어`,
      'NWF': `- 약 150개의 무의미 단어
- CVC 90개, CCVC/CVCC 50개, 복합 10개
- 파닉스 규칙을 따름`,
      'WRF': `- 약 85개의 Sight Words
- 고빈도 단어 중심
- 난이도별 분포`,
      'ORF': `- 약 150단어의 지문
- 학년 수준에 맞는 내용
- 자연스러운 대화체`,
      'MAZE': `- 정확히 20개 문항
- 4개 스토리로 구성
- 각 문항마다 3개 선택지, 1개 정답`
    };

    return requirements[testType] || '';
  }
}


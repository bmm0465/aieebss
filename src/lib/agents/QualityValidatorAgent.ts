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
        response_format: { type: "json_object" }
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
   * prompts.ts의 실제 규격에 맞춰 작성됨
   */
  private getTestTypeRequirements(testType: TestType): string {
    const requirements: Record<TestType, string> = {
      'LNF': `- 정확히 100개의 알파벳이 있어야 함
- 대문자와 소문자가 균형 있게 분포
- 첫 10개는 고빈도 문자만 사용
- 단어 형성 방지 (cat, run, the 등 연속 단어 형성 금지)
- 연속 중복 방지 (동일 문자가 바로 옆에 오지 않음)
- 허용 문자만 사용 (W, w, 소문자 l 제외)`,
      'PSF': `- 정확히 20개의 최소대립쌍 문항
- 각 문항: { word1, word2, correctAnswer } 형식
- 두 단어는 하나의 음소만 다른 최소대립쌍이어야 함 (예: pin/fin, bat/pat)
- vocabulary_level.json의 어휘 수준 준수`,
      'NWF': `- 정확히 75개의 무의미 단어
- 1~25번: VC, CVC 패턴만 (예: vim, pog, ut, ag)
- 26~45번: CVC, VC + CVCe, CVrC 패턴 혼합 (예: lome, dake, nar, zir)
- 46~60번: 이전 패턴 + CVCC, CCVC 패턴 혼합 (예: hast, polk, snip, chab)
- 61~75번: 모든 패턴 + CCVCC 등 복잡한 자음 혼합 (예: trask, slomp)
- 표준 영어 파닉스 규칙으로 발음 가능해야 함
- 실제 영어 단어는 포함되면 안 됨`,
      'WRF': `- 정확히 85개의 1음절 단어
- 1~15번: 가장 고빈도 사이트 워드 (예: the, a, is, it, in, and, see, my, to)
- 16~50번: 중간 빈도 단어 (예: like, run, can, get, big)
- 51~85번: 상대적으로 낮은 빈도 단어 (예: red, jump, help, fast, six)
- 모든 단어는 실제 영어 단어이며 의미를 가져야 함
- 고유명사 제외`,
      'ORF': `- 문장 배열 형식 (한 문장씩 평가)
- 각 문장은 간단하고 읽기 쉬워야 함
- core_expressions.json의 표현 사용
- vocabulary_level.json의 어휘 수준 준수`,
      'STRESS': `- 정확히 20개의 문항
- 각 문항: { word, choices, correctAnswer } 형식
- 2음절 이상의 단어 사용
- 강세 패턴이 명확한 단어
- vocabulary_level.json의 어휘 수준 준수`,
      'MEANING': `- 정확히 20개의 문항
- 각 문항: { wordOrPhrase, imageOptions, correctAnswer } 형식
- 단어나 간단한 어구 제시
- 3개의 그림 선택지 제공
- vocabulary_level.json의 어휘 수준 준수`,
      'COMPREHENSION': `- 정확히 15개의 문항
- 각 문항: { dialogueOrStory, question, options, correctAnswer } 형식
- 매우 쉽고 간단한 대화나 이야기
- 모습, 크기, 색깔, 인물 등 주요 정보 포함
- core_expressions.json의 표현 사용
- vocabulary_level.json의 어휘 수준 준수`
    };

    return requirements[testType] || '';
  }
}


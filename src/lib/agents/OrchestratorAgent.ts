// Orchestrator Agent
// 전체 워크플로우를 조율하는 메인 Agent

import { createClient } from '@/lib/supabase/server';
import { ItemGeneratorAgent } from './ItemGeneratorAgent';
import { QualityValidatorAgent } from './QualityValidatorAgent';
import { ApprovalWorkflowAgent } from './ApprovalWorkflowAgent';
import type {
  ItemGenerationRequest,
  ItemGenerationResult,
  GeneratedItems,
  TestType
} from './types';

export class OrchestratorAgent {
  private itemGenerator: ItemGeneratorAgent;
  private qualityValidator: QualityValidatorAgent;
  private approvalWorkflow: ApprovalWorkflowAgent;
  private supabase: Awaited<ReturnType<typeof createClient>> | null = null;

  constructor() {
    this.itemGenerator = new ItemGeneratorAgent();
    this.qualityValidator = new QualityValidatorAgent();
    this.approvalWorkflow = new ApprovalWorkflowAgent();
  }

  async initialize() {
    this.supabase = await createClient();
    await this.approvalWorkflow.initialize();
  }

  /**
   * 문항 생성 워크플로우 실행
   */
  async generateItems(
    request: ItemGenerationRequest,
    userId: string
  ): Promise<ItemGenerationResult> {
    try {
      // 1. 문항 생성
      console.log('문항 생성 시작...');
      const { items, pdfReferences } = await this.itemGenerator.generateItems(request);

      // 2. 각 테스트 유형별 품질 검증 (병렬 실행)
      console.log('품질 검증 시작...');
      const qualityScores: Record<string, {
        overall: number;
        dibels_compliance: number;
        grade_level_appropriateness: number;
        curriculum_alignment: number;
        difficulty_appropriateness: number;
        grammar_accuracy: number;
        issues?: string[];
        suggestions?: string[];
      }> = {};

      const validationResults = await Promise.all(
        request.testTypes.map(async (testType) => {
          const testItems = this.extractItemsForTestType(items, testType);
          if (!testItems) return null;

          const score = await this.qualityValidator.validateItems(
            testType,
            request.gradeLevel,
            { [testType]: testItems }
          );
          return { testType, score };
        })
      );

      for (const result of validationResults) {
        if (result) {
          qualityScores[result.testType] = result.score;
        }
      }

      // 전체 품질 점수 계산 (평균)
      const overallScore = this.calculateOverallQualityScore(qualityScores);

      // 3. 데이터베이스에 저장
      console.log('데이터베이스에 저장...');
      if (!this.supabase) await this.initialize();

      const { data: insertedItem, error: insertError } = await this.supabase!
        .from('generated_test_items')
        .insert({
          test_type: request.testTypes[0], // 첫 번째 테스트 유형을 메인으로
          grade_level: request.gradeLevel,
          items: items as unknown as Record<string, unknown>,
          pdf_references: (pdfReferences || []) as unknown as Record<string, unknown>[],
          curriculum_alignment: null,
          quality_score: overallScore, // 숫자로 저장 (데이터베이스 NUMERIC 타입)
          status: 'pending',
          generated_by: userId
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`문항 저장 오류: ${insertError.message}`);
      }

      return {
        success: true,
        items,
        itemId: insertedItem.id,
        qualityScore: {
          overall: overallScore,
          dibels_compliance: this.getAverageScore(qualityScores, 'dibels_compliance'),
          grade_level_appropriateness: this.getAverageScore(qualityScores, 'grade_level_appropriateness'),
          curriculum_alignment: this.getAverageScore(qualityScores, 'curriculum_alignment'),
          difficulty_appropriateness: this.getAverageScore(qualityScores, 'difficulty_appropriateness'),
          grammar_accuracy: this.getAverageScore(qualityScores, 'grammar_accuracy'),
          issues: this.collectIssues(qualityScores),
          suggestions: this.collectSuggestions(qualityScores)
        },
        pdfReferences
      };
    } catch (error) {
      console.error('문항 생성 워크플로우 오류:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류'
      };
    }
  }

  /**
   * 특정 테스트 유형의 문항 추출
   */
  private extractItemsForTestType(
    items: GeneratedItems,
    testType: TestType
  ): GeneratedItems[TestType] | undefined {
    return items[testType];
  }

  /**
   * 전체 품질 점수 계산
   */
  private calculateOverallQualityScore(
    qualityScores: Record<string, {
      overall: number;
      dibels_compliance: number;
      grade_level_appropriateness: number;
      curriculum_alignment: number;
      difficulty_appropriateness: number;
      grammar_accuracy: number;
      issues?: string[];
      suggestions?: string[];
    }>
  ): number {
    if (Object.keys(qualityScores).length === 0) return 0;

    const scores = Object.values(qualityScores).map((score) => score.overall || 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }

  /**
   * 평균 점수 계산
   */
  private getAverageScore(
    qualityScores: Record<string, {
      overall: number;
      dibels_compliance: number;
      grade_level_appropriateness: number;
      curriculum_alignment: number;
      difficulty_appropriateness: number;
      grammar_accuracy: number;
      issues?: string[];
      suggestions?: string[];
    }>,
    key: 'dibels_compliance' | 'grade_level_appropriateness' | 'curriculum_alignment' | 'difficulty_appropriateness' | 'grammar_accuracy'
  ): number {
    const scores = Object.values(qualityScores)
      .map((score) => score[key] || 0)
      .filter((score: number) => score > 0);

    if (scores.length === 0) return 0;

    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }

  /**
   * 모든 이슈 수집
   */
  private collectIssues(qualityScores: Record<string, {
    overall: number;
    dibels_compliance: number;
    grade_level_appropriateness: number;
    curriculum_alignment: number;
    difficulty_appropriateness: number;
    grammar_accuracy: number;
    issues?: string[];
    suggestions?: string[];
  }>): string[] {
    const issues: string[] = [];
    for (const [testType, score] of Object.entries(qualityScores)) {
      if (score.issues && Array.isArray(score.issues)) {
        issues.push(...score.issues.map((issue: string) => `[${testType}] ${issue}`));
      }
    }
    return issues;
  }

  /**
   * 모든 제안 수집
   */
  private collectSuggestions(qualityScores: Record<string, {
    overall: number;
    dibels_compliance: number;
    grade_level_appropriateness: number;
    curriculum_alignment: number;
    difficulty_appropriateness: number;
    grammar_accuracy: number;
    issues?: string[];
    suggestions?: string[];
  }>): string[] {
    const suggestions: string[] = [];
    for (const [testType, score] of Object.entries(qualityScores)) {
      if (score.suggestions && Array.isArray(score.suggestions)) {
        suggestions.push(...score.suggestions.map((suggestion: string) => `[${testType}] ${suggestion}`));
      }
    }
    return suggestions;
  }
}


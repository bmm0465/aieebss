// 문항 생성 Agent
// DIBELS 8th Edition 기준으로 문항을 생성하고, PDF 내용을 참조하여 교육과정 기반 문항 생성

import OpenAI from 'openai';
import type {
  GeneratedItems,
  ItemGenerationRequest,
  TestType,
  GradeLevel
} from './types';
import { RAGAgent } from './RAGAgent';
import {
  buildLNFSystemPrompt,
  buildLNFUserPrompt,
  buildPSFSystemPrompt,
  buildPSFUserPrompt,
  buildNWFSystemPrompt,
  buildNWFUserPrompt,
  buildWRFSystemPrompt,
  buildWRFUserPrompt,
  buildORFSystemPrompt,
  buildORFUserPrompt,
  buildMazeSystemPrompt,
  buildMazeUserPrompt,
  type PSFWordSpec,
  type MazeItemSpec
} from './prompts';
import { loadVocabularyByLevel, loadCoreExpressions } from './dataUtils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ItemGeneratorAgent {
  private ragAgent: RAGAgent;

  constructor() {
    this.ragAgent = new RAGAgent();
  }

  /**
   * 문항 생성
   * - 요청된 각 테스트 유형별로 전용 프롬프트/전략을 사용하여 LLM을 호출
   */
  async generateItems(
    request: ItemGenerationRequest
  ): Promise<{
    items: GeneratedItems;
    pdfReferences?: Array<{ pdf_id: string; pdf_filename: string; chunk_ids: string[] }>;
  }> {
    const { testTypes, gradeLevel } = request;

    // PDF 참조 컨텍스트 추출 (기존 로직 유지)
    let pdfContext = '';
    const pdfReferences: Array<{ pdf_id: string; pdf_filename: string; chunk_ids: string[] }> = [];

    if (request.pdfIds && request.pdfIds.length > 0) {
      await this.ragAgent.initialize();

      for (const testType of testTypes) {
        const { context, pdfReference } =
          await this.ragAgent.extractContextForItemGeneration(
            request.pdfIds,
            testType,
            gradeLevel
          );

        if (pdfReference) {
          pdfReferences.push(pdfReference);
        }
        pdfContext += context;
      }
    }

    const aggregatedItems: GeneratedItems = {};

    for (const testType of testTypes) {
      const itemsForType = await this.generateItemsForTestType(
        testType,
        gradeLevel,
        pdfContext,
        request
      );

      if (itemsForType) {
        (aggregatedItems as any)[testType] = itemsForType;
      }
    }

    return {
      items: aggregatedItems,
      pdfReferences: pdfReferences.length > 0 ? pdfReferences : undefined
    };
  }

  /**
   * 평가 유형별 문항 생성 헬퍼
   */
  private async generateItemsForTestType(
    testType: TestType,
    gradeLevel: GradeLevel,
    pdfContext: string,
    request: ItemGenerationRequest
  ): Promise<GeneratedItems[keyof GeneratedItems] | undefined> {
    // 학년 수준 기반 단어/표현 후보 로드
    const vocabulary = loadVocabularyByLevel(gradeLevel);
    const coreExpressions = loadCoreExpressions(gradeLevel);

    // 공통 reference / custom instruction 컨텍스트
    const referenceContext = request.referenceDocument
      ? `\n\n추가 참고 문서:\n${request.referenceDocument}`
      : '';
    const customInstructions = request.customInstructions
      ? `\n\n사용자 지정 지시사항:\n${request.customInstructions}`
      : '';

    let systemPrompt = '';
    let userPrompt = '';

    switch (testType) {
      case 'LNF':
        systemPrompt = buildLNFSystemPrompt();
        userPrompt = buildLNFUserPrompt();
        break;
      case 'PSF':
        systemPrompt = buildPSFSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildPSFUserPrompt();
        break;
      case 'NWF':
        systemPrompt = buildNWFSystemPrompt();
        userPrompt = buildNWFUserPrompt();
        break;
      case 'WRF':
        systemPrompt = buildWRFSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildWRFUserPrompt();
        break;
      case 'ORF':
        systemPrompt = buildORFSystemPrompt(gradeLevel, coreExpressions);
        userPrompt = buildORFUserPrompt();
        break;
      case 'MAZE':
        systemPrompt = buildMazeSystemPrompt(gradeLevel, coreExpressions);
        userPrompt = buildMazeUserPrompt();
        break;
      default:
        return undefined;
    }

    const fullUserPrompt = `학년: ${gradeLevel}
평가 유형: ${testType}

${pdfContext}
${referenceContext}
${customInstructions}

${userPrompt}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullUserPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const raw = completion.choices[0].message.content || '{}';
    const parsed = JSON.parse(raw) as any;

    switch (testType) {
      case 'LNF':
        return parsed.LNF as string[];
      case 'PSF':
        // PSF는 { index, word, phonemeCount } 배열에서 단어 문자열만 추출
        // GeneratedItems 타입과의 호환성을 위해 string[]로 저장
        if (Array.isArray(parsed.PSF)) {
          const words = (parsed.PSF as PSFWordSpec[]).map((item) => item.word);
          return words as string[];
        }
        return undefined;
      case 'NWF':
        if (Array.isArray(parsed.NWF)) {
          const words = parsed.NWF.map((item: { word: string }) => item.word);
          return words as string[];
        }
        return undefined;
      case 'WRF':
        if (Array.isArray(parsed.WRF)) {
          const words = parsed.WRF.map((item: { word: string } | string) =>
            typeof item === 'string' ? item : item.word
          );
          return words as string[];
        }
        return undefined;
      case 'ORF':
        return parsed.ORF as string;
      case 'MAZE':
        if (Array.isArray(parsed.MAZE)) {
          const mazeItems = parsed.MAZE.map((item: MazeItemSpec, idx: number) => ({
            num: item.num ?? idx + 1,
            sentence: item.sentence,
            choices: item.choices,
            answer: item.answer
          }));
          return mazeItems;
        }
        return undefined;
      default:
        return undefined;
    }
  }
}


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
  buildSTRESSSystemPrompt,
  buildSTRESSUserPrompt,
  buildMEANINGSystemPrompt,
  buildMEANINGUserPrompt,
  buildCOMPREHENSIONSystemPrompt,
  buildCOMPREHENSIONUserPrompt,
  type PSFWordSpec,
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

    // 테스트 유형별 문항 생성을 병렬로 실행하여 전체 시간을 단축
    const results = await Promise.all(
      testTypes.map((testType) =>
        this.generateItemsForTestType(testType, gradeLevel, pdfContext, request)
      )
    );

    results.forEach((itemsForType, index) => {
      const testType = testTypes[index];
      if (itemsForType === undefined) return;

      switch (testType) {
        case 'LNF':
          aggregatedItems.LNF = itemsForType as string[];
          break;
        case 'PSF':
          aggregatedItems.PSF = itemsForType as Array<{
            word1: string;
            word2: string;
            correctAnswer: string;
          }>;
          break;
        case 'NWF':
          aggregatedItems.NWF = itemsForType as string[];
          break;
        case 'WRF':
          aggregatedItems.WRF = itemsForType as string[];
          break;
        case 'ORF':
          aggregatedItems.ORF = itemsForType as string[];
          break;
        case 'STRESS':
          aggregatedItems.STRESS = itemsForType as Array<{
            word: string;
            choices: string[];
            correctAnswer: string;
          }>;
          break;
        case 'MEANING':
          aggregatedItems.MEANING = itemsForType as Array<{
            wordOrPhrase: string;
            imageOptions: string[];
            correctAnswer: string;
          }>;
          break;
        case 'COMPREHENSION':
          aggregatedItems.COMPREHENSION = itemsForType as Array<{
            dialogueOrStory: string;
            question: string;
            options: Array<{
              type: 'image' | 'word';
              content: string;
            }>;
            correctAnswer: string;
          }>;
          break;
        default:
          break;
      }
    });

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
      case 'STRESS':
        systemPrompt = buildSTRESSSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildSTRESSUserPrompt();
        break;
      case 'MEANING':
        systemPrompt = buildMEANINGSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildMEANINGUserPrompt();
        break;
      case 'COMPREHENSION':
        systemPrompt = buildCOMPREHENSIONSystemPrompt(gradeLevel, coreExpressions);
        userPrompt = buildCOMPREHENSIONUserPrompt();
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
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices[0].message.content || '{}';

    type NwfItem = { index?: number; pattern?: string; word: string };
    type WrfItem = { index?: number; word: string };
    type ParsedResponse = {
      LNF?: string[];
      PSF?: PSFWordSpec[] | string[] | Array<{ word1: string; word2: string; correctAnswer: string }>;
      NWF?: NwfItem[];
      WRF?: WrfItem[] | string[];
      ORF?: string | string[];
      STRESS?: Array<{ word: string; choices: string[]; correctAnswer: string }>;
      MEANING?: Array<{ wordOrPhrase: string; imageOptions: string[]; correctAnswer: string }>;
      COMPREHENSION?: Array<{
        dialogueOrStory: string;
        question: string;
        options: Array<{ type: 'image' | 'word'; content: string }>;
        correctAnswer: string;
      }>;
    };

    const parsed = JSON.parse(raw) as ParsedResponse;

    switch (testType) {
      case 'LNF':
        return parsed.LNF as string[];
      case 'PSF':
        // PSF는 최소대립쌍 형식
        if (Array.isArray(parsed.PSF)) {
          return parsed.PSF as Array<{ word1: string; word2: string; correctAnswer: string }>;
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
        // ORF는 문장 배열로 변경
        if (typeof parsed.ORF === 'string') {
          // 기존 형식(전체 지문)을 문장 배열로 변환
          const sentences = parsed.ORF.split(/[.!?]+/).filter(s => s.trim().length > 0);
          return sentences.map(s => s.trim() + '.');
        }
        if (Array.isArray(parsed.ORF)) {
          return parsed.ORF as string[];
        }
        return undefined;
      case 'STRESS':
        if (Array.isArray(parsed.STRESS)) {
          return parsed.STRESS as Array<{ word: string; choices: string[]; correctAnswer: string }>;
        }
        return undefined;
      case 'MEANING':
        if (Array.isArray(parsed.MEANING)) {
          return parsed.MEANING as Array<{ wordOrPhrase: string; imageOptions: string[]; correctAnswer: string }>;
        }
        return undefined;
      case 'COMPREHENSION':
        if (Array.isArray(parsed.COMPREHENSION)) {
          return parsed.COMPREHENSION as Array<{
            dialogueOrStory: string;
            question: string;
            options: Array<{ type: 'image' | 'word'; content: string }>;
            correctAnswer: string;
          }>;
        }
        return undefined;
      default:
        return undefined;
    }
  }
}


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
        case 'p1_alphabet':
          aggregatedItems.p1_alphabet = itemsForType as string[];
          break;
        case 'p2_segmental_phoneme':
          aggregatedItems.p2_segmental_phoneme = itemsForType as Array<{
            word1: string;
            word2: string;
            correctAnswer: string;
          }>;
          break;
        case 'p3_suprasegmental_phoneme':
          aggregatedItems.p3_suprasegmental_phoneme = itemsForType as Array<{
            word: string;
            choices: string[];
            correctAnswer: string;
          }>;
          break;
        case 'p4_phonics':
          aggregatedItems.p4_phonics = itemsForType as { nwf?: string[]; wrf?: string[]; orf?: string[] };
          break;
        case 'p5_vocabulary':
          aggregatedItems.p5_vocabulary = itemsForType as Array<{
            wordOrPhrase: string;
            imageOptions: string[];
            correctAnswer: string;
          }>;
          break;
        case 'p6_comprehension':
          aggregatedItems.p6_comprehension = itemsForType as Array<{
            dialogueOrStory: string;
            question: string;
            options: Array<{
              type: 'image' | 'word';
              content: string;
            }>;
            correctAnswer: string;
          }>;
          break;
        // 하위 호환성을 위한 구형 타입 지원
        case 'LNF':
          aggregatedItems.p1_alphabet = itemsForType as string[];
          break;
        case 'PSF':
          aggregatedItems.p2_segmental_phoneme = itemsForType as Array<{
            word1: string;
            word2: string;
            correctAnswer: string;
          }>;
          break;
        case 'NWF':
        case 'WRF':
        case 'ORF':
          if (!aggregatedItems.p4_phonics) aggregatedItems.p4_phonics = {};
          if (testType === 'NWF') aggregatedItems.p4_phonics.nwf = itemsForType as string[];
          else if (testType === 'WRF') aggregatedItems.p4_phonics.wrf = itemsForType as string[];
          else aggregatedItems.p4_phonics.orf = itemsForType as string[];
          break;
        case 'STRESS':
          aggregatedItems.p3_suprasegmental_phoneme = itemsForType as Array<{
            word: string;
            choices: string[];
            correctAnswer: string;
          }>;
          break;
        case 'MEANING':
          aggregatedItems.p5_vocabulary = itemsForType as Array<{
            wordOrPhrase: string;
            imageOptions: string[];
            correctAnswer: string;
          }>;
          break;
        case 'COMPREHENSION':
          aggregatedItems.p6_comprehension = itemsForType as Array<{
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
      case 'p1_alphabet':
        systemPrompt = buildLNFSystemPrompt();
        userPrompt = buildLNFUserPrompt();
        break;
      case 'p2_segmental_phoneme':
        systemPrompt = buildPSFSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildPSFUserPrompt();
        break;
      case 'p3_suprasegmental_phoneme':
        systemPrompt = buildSTRESSSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildSTRESSUserPrompt();
        break;
      case 'p4_phonics':
        // p4_phonics는 ORF 프롬프트 사용 (NWF/WRF/ORF 통합)
        systemPrompt = buildORFSystemPrompt(gradeLevel, coreExpressions);
        userPrompt = buildORFUserPrompt();
        break;
      case 'p5_vocabulary':
        systemPrompt = buildMEANINGSystemPrompt(gradeLevel, vocabulary);
        userPrompt = buildMEANINGUserPrompt();
        break;
      case 'p6_comprehension':
        systemPrompt = buildCOMPREHENSIONSystemPrompt(gradeLevel, coreExpressions);
        userPrompt = buildCOMPREHENSIONUserPrompt();
        break;
      // 하위 호환성을 위한 구형 타입 지원
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
      case 'p1_alphabet':
        return parsed.p1_alphabet || parsed.LNF as string[];
      case 'p2_segmental_phoneme':
        if (Array.isArray(parsed.p2_segmental_phoneme)) {
          return parsed.p2_segmental_phoneme as Array<{ word1: string; word2: string; correctAnswer: string }>;
        }
        if (Array.isArray(parsed.PSF)) {
          return parsed.PSF as Array<{ word1: string; word2: string; correctAnswer: string }>;
        }
        return undefined;
      case 'p3_suprasegmental_phoneme':
        if (Array.isArray(parsed.p3_suprasegmental_phoneme)) {
          return parsed.p3_suprasegmental_phoneme as Array<{ word: string; choices: string[]; correctAnswer: string }>;
        }
        if (Array.isArray(parsed.STRESS)) {
          return parsed.STRESS as Array<{ word: string; choices: string[]; correctAnswer: string }>;
        }
        return undefined;
      case 'p4_phonics':
        return parsed.p4_phonics || {
          nwf: parsed.NWF ? (Array.isArray(parsed.NWF) ? parsed.NWF.map((item: { word: string }) => item.word) : []) : undefined,
          wrf: parsed.WRF ? (Array.isArray(parsed.WRF) ? parsed.WRF.map((item: { word: string } | string) => typeof item === 'string' ? item : item.word) : []) : undefined,
          orf: parsed.ORF ? (typeof parsed.ORF === 'string' ? parsed.ORF.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).map((s: string) => s.trim() + '.') : (Array.isArray(parsed.ORF) ? parsed.ORF : [])) : undefined
        };
      case 'p5_vocabulary':
        if (Array.isArray(parsed.p5_vocabulary)) {
          return parsed.p5_vocabulary as Array<{ wordOrPhrase: string; imageOptions: string[]; correctAnswer: string }>;
        }
        if (Array.isArray(parsed.MEANING)) {
          return parsed.MEANING as Array<{ wordOrPhrase: string; imageOptions: string[]; correctAnswer: string }>;
        }
        return undefined;
      case 'p6_comprehension':
        if (Array.isArray(parsed.p6_comprehension)) {
          return parsed.p6_comprehension as Array<{
            dialogueOrStory: string;
            question: string;
            options: Array<{ type: 'image' | 'word'; content: string }>;
            correctAnswer: string;
          }>;
        }
        if (Array.isArray(parsed.COMPREHENSION)) {
          return parsed.COMPREHENSION as Array<{
            dialogueOrStory: string;
            question: string;
            options: Array<{ type: 'image' | 'word'; content: string }>;
            correctAnswer: string;
          }>;
        }
        return undefined;
      // 하위 호환성을 위한 구형 타입 지원
      case 'LNF':
        return parsed.LNF as string[];
      case 'PSF':
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
        if (typeof parsed.ORF === 'string') {
          const sentences = parsed.ORF.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
          return sentences.map((s: string) => s.trim() + '.');
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


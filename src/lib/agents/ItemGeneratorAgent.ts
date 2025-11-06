// 문항 생성 Agent
// DIBELS 8th Edition 기준으로 문항을 생성하고, PDF 내용을 참조하여 교육과정 기반 문항 생성

import OpenAI from 'openai';
import type { GeneratedItems, ItemGenerationRequest } from './types';
import { RAGAgent } from './RAGAgent';

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
   */
  async generateItems(
    request: ItemGenerationRequest
  ): Promise<{
    items: GeneratedItems;
    pdfReferences?: Array<{ pdf_id: string; pdf_filename: string; chunk_ids: string[] }>;
  }> {
    // PDF 참조 컨텍스트 추출
    let pdfContext = '';
    const pdfReferences: Array<{ pdf_id: string; pdf_filename: string; chunk_ids: string[] }> = [];

    if (request.pdfIds && request.pdfIds.length > 0) {
      await this.ragAgent.initialize();
      
      for (const testType of request.testTypes) {
        const { context, pdfReference } = await this.ragAgent.extractContextForItemGeneration(
          request.pdfIds,
          testType,
          request.gradeLevel
        );
        
        if (pdfReference) {
          pdfReferences.push(pdfReference);
        }
        pdfContext += context;
      }
    }

    // 시스템 프롬프트 생성
    const systemPrompt = this.buildSystemPrompt();

    // 사용자 프롬프트 생성
    const userPrompt = this.buildUserPrompt(request, pdfContext);

    // LLM 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const generatedItems = JSON.parse(
      completion.choices[0].message.content || '{}'
    ) as GeneratedItems;

    return {
      items: generatedItems,
      pdfReferences: pdfReferences.length > 0 ? pdfReferences : undefined
    };
  }

  /**
   * 시스템 프롬프트 생성
   */
  private buildSystemPrompt(): string {
    return `당신은 DIBELS 8th Edition 평가 문항을 생성하는 전문가입니다. 
다음 평가 유형에 맞는 문항을 생성해주세요:

1. **LNF (Letter Naming Fluency)**: 알파벳 인식 능력 평가
   - 200개의 대소문자 알파벳을 무작위 순서로 배열 (대문자 약 40%, 소문자 약 60%)
   - 예시: t, n, f, y, I, R, D, G, Y, V, r, b, P, L, Z...

2. **PSF (Phoneme Segmentation Fluency)**: 음소 분리 능력 평가
   - 약 100개의 단순한 영어 단어 (CVC, CVCC, CCVC 패턴)
   - 예시: road, dad, six, frog, on, cry, sit, camp...

3. **NWF (Nonsense Word Fluency)**: 파닉스 적용 능력 평가
   - 약 150개의 무의미 단어 (CVC 90개, CCVC/CVCC 50개, 복합 10개)
   - 예시: sep, nem, dib, rop, lin, fom, stam, clen, frap...

4. **WRF (Word Recognition Fluency)**: Sight Words 인식 능력 평가
   - 약 85개의 고빈도 영어 단어 (난이도별 분포)
   - 예시: no, do, he, go, it, to, me, up, the, she, this, that...

5. **ORF (Oral Reading Fluency)**: 읽기 유창성 평가
   - 약 150단어의 학년 수준에 맞는 대화형 지문 (5개 미니 스토리)
   - 대화체로 구성하되 자연스러운 흐름 유지

6. **MAZE**: 독해력 및 문맥 이해 평가
   - 20개 문항 (4개 스토리)
   - 각 문항: 문장 + 3개 선택지 (정답 1개)
   - 예시: "I like _____ and oranges." [apples, books, dogs]

제공된 교육과정 참고 자료가 있다면, 그 내용을 반영하여 문항을 생성하세요.`;
  }

  /**
   * 사용자 프롬프트 생성
   */
  private buildUserPrompt(
    request: ItemGenerationRequest,
    pdfContext: string
  ): string {
    const referenceContext = request.referenceDocument
      ? `\n\n추가 참고 문서:\n${request.referenceDocument}`
      : '';

    const customInstructions = request.customInstructions
      ? `\n\n사용자 지정 지시사항:\n${request.customInstructions}`
      : '';

    return `학년: ${request.gradeLevel}
생성할 평가 유형: ${request.testTypes.join(', ')}

${pdfContext}

${referenceContext}

${customInstructions}

위 평가 유형들에 맞는 문항을 JSON 형식으로 생성해주세요. 
각 평가의 특성과 문항 수를 정확히 반영하고, 학년 수준에 적합한 난이도로 작성해주세요.
제공된 교육과정 참고 자료의 내용을 적극 활용하여 한국 교육과정에 부합하는 문항을 생성해주세요.

반환 형식:
{
  "LNF": ["t", "n", "f", ...] (200개),
  "PSF": ["road", "dad", ...] (100개),
  "NWF": ["sep", "nem", ...] (150개),
  "WRF": ["no", "do", ...] (85개),
  "ORF": "Hello! How many dogs?\\n..." (150단어 지문),
  "MAZE": [
    {
      "num": 1,
      "sentence": "I like _____ and oranges.",
      "choices": ["apples", "books", "dogs"],
      "answer": "apples"
    },
    ...
  ] (20개)
}`;
  }
}


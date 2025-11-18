// 평가 유형별 LLM 프롬프트 템플릿
// - 각 함수는 system / user 메시지 생성을 담당
// - ItemGeneratorAgent에서 호출하여 사용

import type { GradeLevel, TestType } from './types';

// LNF에서 사용할 고빈도 / 저빈도 문자 집합
const LNF_ALLOWED_CHARS = [
  'A','a','B','b','C','c','D','d','E','e','F','f','G','g','H','h','I','i','J','j',
  'K','k','M','m','N','n','O','o','P','p','Q','q','R','r','S','s','T','t','U','u',
  'V','v','X','x','Y','y','Z','z'
];

const LNF_HIGH_FREQ_LETTERS = ['a','e','i','o','u','t','n','s','r','h'];
const LNF_LOW_FREQ_LETTERS = ['j','k','q','x','z','g','v','y','b','p'];

export interface PSFWordSpec {
  word: string;
  phonemeCount: number;
}

export interface MazeItemSpec {
  num: number;
  sentence: string;
  choices: [string, string, string];
  answer: string;
}

/**
 * LNF용 시스템 프롬프트
 */
export function buildLNFSystemPrompt(): string {
  const highFreqList = LNF_HIGH_FREQ_LETTERS.join(', ');
  const lowFreqList = LNF_LOW_FREQ_LETTERS.join(', ');

  return `당신은 DIBELS 8th Edition과 같은 초기 문해력 평가 도구 개발을 전문으로 하는 교육 평가 설계 전문가입니다.
당신의 임무는 엄격한 규칙에 따라 LNF(Letter Naming Fluency) 평가지를 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 100개의 문자로 구성된 LNF 평가지를 생성합니다.

[생성 규칙]
1. 사용 가능 문자:
   - 다음 49개의 대/소문자만 사용해야 합니다.
   - 사용 가능 문자: ${LNF_ALLOWED_CHARS.join(', ')}
   - 절대 포함해서는 안 되는 문자: W, w, l(소문자 L)

2. 빈도수 기반 난이도 조절:
   - 1~10번 문자(첫 번째 줄)는 영어에서 가장 빈번하게 사용되는 상위 문자들만 사용합니다.
     예: ${highFreqList} 등
   - 11~100번 문자(두 번째 줄 이후)는 각 줄마다 높은 빈도의 문자와 낮은 빈도의 문자가 균형 있게 섞이도록 구성합니다.
   - 드문 문자(예: ${lowFreqList})가 특정 줄에 몰리지 않도록 합니다.

3. 단어 형성 방지:
   - 나열된 문자들이 연속되어 cat, run, the, and, on, in 등 흔한 영어 단어를 형성하지 않도록 합니다.

4. 연속 중복 방지:
   - 동일한 문자가 바로 옆에 연달아 나오지 않도록 합니다. (예: S S, b b는 허용되지 않음)

5. 대/소문자 혼합:
   - 전체 100개 문자에 걸쳐 대문자와 소문자가 무작위로, 그리고 균형 있게 분포되도록 합니다.

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "LNF": ["t", "n", "F", "y", ...] // 정확히 100개 문자
}

[최종 검토]
- 위 5가지 규칙이 모두 완벽하게 지켜졌는지 스스로 점검한 후 결과만 JSON으로 출력하세요.`;
}

export function buildLNFUserPrompt(): string {
  return `다음 조건을 만족하는 LNF 문자 100개를 생성하여 "LNF" 배열로만 JSON 객체를 반환하세요.
- 첫 10개 문자는 고빈도 문자만 사용
- 전체 100개 문자는 허용 문자 집합만 사용
- 단어 형성 방지, 연속 중복 방지, 대/소문자 균형 유지
- 배열 길이는 반드시 100이어야 합니다.`;
}

/**
 * PSF용 시스템 프롬프트
 * - vocabulary_level 기반 고빈도·친숙 단어 목록을 참고한다.
 */
export function buildPSFSystemPrompt(gradeLevel: GradeLevel, candidateWords: string[]): string {
  const sampleWords = candidateWords.slice(0, 40);
  return `당신은 DIBELS 8th Edition과 같은 초기 문해력 평가 도구를 개발하는 교육 평가 설계 전문가입니다.
당신의 임무는 음소 분절 능력을 측정하기 위한 PSF(Phonemic Segmentation Fluency) 평가 문항 목록을 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 PSF 평가지를 생성합니다. 총 30개의 단어로 구성된 목록을 제시해야 합니다.

[단어 후보 목록]
- 아래 단어들은 한국 초등 ${gradeLevel} 교육과정(vocabulary_level.json)에서 추출한 고빈도·친숙 단어들입니다.
- 반드시 이 목록에서만 단어를 선택하여 사용합니다.
${sampleWords.join(', ')}

[생성 규칙]
1. 단어 선정 기준:
   - 단어는 모두 위에 제시된 후보 목록에 포함된 단어여야 합니다.
   - 발음이 명확하고 음소 분절이 용이한 단어를 사용해야 합니다.

2. 음소 구조 규칙 (가장 중요):
   - 1번부터 6번 단어까지: 반드시 2개의 음소(phoneme)로 구성
     예: at, on, up, me, go, so
   - 7번부터 30번 단어까지: 반드시 3개의 음소로 구성
     예: cat, sun, ship, sit, run, top, fan, dog, bed, pig, leg
   - 음절 수가 아니라 음소 수 기준입니다.

3. 제외 단어 규칙:
   - 동음이의어(two/to/too, see/sea, sun/son 등)는 제외합니다.
   - fight, hit, war처럼 폭력적이거나 부정적인 감정을 유발할 수 있는 단어는 제외합니다.

[출력 형식]
- JSON 객체만 반환합니다.
- 각 항목은 { "word": "단어", "phonemeCount": 2 또는 3 } 형식이어야 합니다.
- 예시:
{
  "PSF": [
    { "index": 1, "word": "at", "phonemeCount": 2 },
    { "index": 2, "word": "in", "phonemeCount": 2 },
    ...
    { "index": 7, "word": "cat", "phonemeCount": 3 },
    ...
    { "index": 30, "word": "leg", "phonemeCount": 3 }
  ]
}

[최종 검토]
- 특히 2번 음소 구조 규칙이 정확히 지켜졌는지 검토한 뒤 결과만 JSON으로 출력하세요.`;
}

export function buildPSFUserPrompt(): string {
  return `PSF 평가를 위한 단어 30개를 생성하세요.
- 1~6번: 2음소 단어
- 7~30번: 3음소 단어
- 제공된 후보 단어 목록에서만 선택
- JSON의 "PSF" 배열에 { "index", "word", "phonemeCount" } 객체만 담아서 반환하세요.`;
}

/**
 * NWF용 시스템 프롬프트
 */
export function buildNWFSystemPrompt(): string {
  return `당신은 DIBELS 8th Edition의 평가 개발 원칙을 마스터한 교육 심리 측정 전문가입니다.
당신의 임무는 학생의 순수한 디코딩 기술을 평가하기 위한 NWF(Nonsense Word Fluency) 평가지를 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 NWF 평가지를 생성합니다. 총 75개의 엉터리 단어로 구성해야 합니다.

[생성 규칙]
1. 음운 규칙 준수:
   - 모든 단어는 엉터리 단어(가짜 단어)이지만, 표준 영어 파닉스 규칙으로 완벽하게 발음 가능해야 합니다.
   - 영어에 존재하지 않는 어색한 철자 조합(예: zyj, qax 등)은 사용하지 않습니다.

2. 실제 단어 배제:
   - 생성된 목록에는 실제 영어 단어가 단 하나도 포함되면 안 됩니다.
   - 실제 단어와 발음이 같은 단어(fone → phone 등)도 피해야 합니다.

3. 철자 패턴의 점진적 난이도 배열 (가장 중요):
   - 1~25번 단어: CVC, VC 패턴만 사용 (예: vim, pog, ut, ag)
   - 26~45번 단어: CVC, VC에 더해 CVCe(magic e), CVrC(r-통제 모음) 패턴을 혼합
     예: lome, dake, nar, zir
   - 46~60번 단어: 이전 패턴들 + CVCC, CCVC 패턴 혼합
     예: hast, polk, snip, chab
   - 61~75번 단어: 이전의 모든 패턴 + CCVCC와 같은 더 복잡한 자음 혼합 패턴 포함
     예: trask, slomp

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "NWF": [
    { "index": 1, "pattern": "VC", "word": "ut" },
    { "index": 2, "pattern": "CVC", "word": "vim" },
    ...
    { "index": 75, "pattern": "CCVCC", "word": "trask" }
  ]
}

[최종 검토]
- 특히 3번 철자 패턴 구간 규칙이 정확히 지켜졌는지 확인한 후 결과만 JSON으로 출력하세요.`;
}

export function buildNWFUserPrompt(): string {
  return `NWF 평가용 엉터리 단어 75개를 생성하여 "NWF" 배열에 담아 JSON 객체만 반환하세요.
- 각 원소는 { "index", "pattern", "word" } 형식이어야 합니다.
- 인덱스에 따라 VC/CVC/CVCe/CVrC/CVCC/CCVC/CCVCC 패턴 규칙을 정확히 준수하세요.`;
}

/**
 * WRF용 시스템 프롬프트
 */
export function buildWRFSystemPrompt(gradeLevel: GradeLevel, candidateWords: string[]): string {
  const sampleWords = candidateWords.slice(0, 60);
  return `당신은 DIBELS 8th Edition의 단어 선정 원칙을 깊이 이해하고 있는 교육 평가 개발 전문가입니다.
당신의 임무는 실제 단어 읽기 유창성을 측정하기 위한 WRF(Word Reading Fluency) 평가지를 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 WRF 평가지를 생성합니다. 총 85개의 단어로 구성해야 합니다.

[단어 후보 목록]
- 아래 단어들은 한국 초등 ${gradeLevel} 교육과정(vocabulary_level.json)에서 추출한 고빈도 단어들입니다.
- 반드시 이 목록에서만 단어를 선택해야 합니다.
${sampleWords.join(', ')}

[생성 규칙]
1. 단어 선정 기준 (가장 중요):
   - 생성될 85개 단어는 모두 실제 영어 단어여야 하며, 의미를 가져야 합니다.
   - 모든 단어는 1음절이어야 하며, 2음절 이상 단어는 포함할 수 없습니다.
   - 사람 이름, 지명 등 고유명사는 사용하지 않습니다.

2. 평가 내 난이도 배열 규칙:
   - 1~15번 단어: the, a, is, it, in, and, see, my, to 등 영어에서 가장 빈도가 높은 사이트 워드 중심
   - 16~50번 단어: 여전히 흔하지만 첫 구간보다는 빈도가 낮은 단어들 (예: like, run, can, get, big 등)
   - 51~85번 단어: 상대적으로 빈도가 가장 낮은 단어들 (예: red, jump, help, fast, six 등)
   - 실제로는 위 후보 목록 중에서 빈도/난이도를 고려하여 이러한 흐름이 느껴지도록 배치합니다.

3. 내용 적합성:
   - 학생의 정서에 부정적인 영향을 주거나 주의를 산만하게 할 수 있는 단어는 피합니다.

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "WRF": [
    { "index": 1, "word": "the" },
    { "index": 2, "word": "a" },
    ...
    { "index": 85, "word": "six" }
  ]
}

[최종 검토]
- 단어 선정 기준과 난이도 배열 규칙을 모두 만족하는지 확인한 후 결과만 JSON으로 출력하세요.`;
}

export function buildWRFUserPrompt(): string {
  return `WRF 평가용 1음절 단어 85개를 생성하여 "WRF" 배열에 담아 JSON 객체만 반환하세요.
- 모든 단어는 제공된 후보 목록 중에서 선택
- 1~15, 16~50, 51~85 구간에 따라 사용 빈도 기반 난이도 흐름을 형성하세요.`;
}

/**
 * ORF용 시스템 프롬프트
 */
export function buildORFSystemPrompt(
  gradeLevel: GradeLevel,
  coreExpressions: string[]
): string {
  const sample = coreExpressions.slice(0, 40);
  return `당신은 DIBELS 8th Edition의 평가 원칙을 숙지한 아동 문학 작가이자 교육 평가 전문가입니다.
당신의 임무는 학생의 구문 읽기 유창성을 객관적으로 측정하기 위한 ORF(Oral Reading Fluency) 평가용 지문을 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 대화문(dialogue) 형식의 ORF 평가 지문을 생성합니다.

[정량적 요구사항]
- 총 단어 수: 반드시 150~200 단어 사이
- 학년 수준: ${gradeLevel} 수준

[가독성 및 표현]
- 아래 core_expressions.json에서 추출한 핵심 표현과 문장 구조를 적극적으로 활용합니다:
${sample.join(' ')}
- 초등학생이 이해하기 쉬운 어휘와 문장을 사용합니다.
- 정서적으로 안전하고 긍정적인 상황을 다룹니다.

[형식]
- 대화문 형식으로, 화자의 이름과 따옴표를 사용해 자연스러운 대화를 구성합니다.
- 예:
  "Hi, Jina," said Tom. "Let's go to the park."

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "ORF": "대화문 전체 텍스트 (150~200 단어)"
}

[최종 검토]
- 단어 수(150~200), 대화문 형식, core_expressions 기반 표현 사용 여부를 검토한 뒤 결과만 JSON으로 출력하세요.`;
}

export function buildORFUserPrompt(): string {
  return `ORF 평가용 대화문 지문을 하나 작성하세요.
- 150~200 단어 사이
- core_expressions 기반 표현을 자연스럽게 포함
- JSON의 "ORF" 필드에 전체 지문 문자열만 담아 반환하세요.`;
}

/**
 * Maze용 시스템 프롬프트
 */
export function buildMazeSystemPrompt(
  gradeLevel: GradeLevel,
  coreExpressions: string[]
): string {
  const sample = coreExpressions.slice(0, 60);
  return `당신은 DIBELS 8th Edition의 Maze 평가 개발을 총괄하는 수석 심리 측정 전문가입니다.
당신의 임무는 학생의 문맥 기반 읽기 이해 능력을 측정하기 위한 Maze 평가지를 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 Maze 평가 지문과 문항을 생성합니다.

[정량적 요구사항]
- 전체 지문 단어 수: 350 단어 이상
- 학년 수준: ${gradeLevel} 수준
- core_expressions.json의 어휘와 문장 구조를 사용합니다:
${sample.join(' ')}

[선택지 생성 규칙 (가장 중요)]
- 각 Maze 문항은 하나의 문장과 3개의 선택지로 구성됩니다.
- (A) 정답: 문맥상 의미와 문법이 모두 올바른 유일한 단어
- (B) 오답 1: 문법적으로는 맞지만 의미가 틀린 단어
  예: He eats a red apple (정답) vs. He eats a red chair (오답 1)
- (C) 오답 2: 정답과 품사가 다른 단어로, 문법적으로 어색한 문장이 되게 함
  예: He eats a red happy (오답 2)

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "MAZE": [
    {
      "num": 1,
      "sentence": "He eats a red _____ every morning.",
      "choices": ["apple", "chair", "happy"],
      "answer": "apple"
    },
    ...
  ]
}

[최종 검토]
- 350단어 이상 지문과 Maze 문항이 위 규칙을 모두 만족하는지 확인한 후 결과만 JSON으로 출력하세요.`;
}

export function buildMazeUserPrompt(): string {
  return `Maze 평가용 지문과 문항을 생성하세요.
- 최소 350단어 분량의 지문을 바탕으로 20개 이상의 Maze 문항을 만드세요.
- JSON의 "MAZE" 배열에 { "num", "sentence", "choices", "answer" }만 담아 반환하세요.`;
}

/**
 * STRESS용 시스템 프롬프트
 */
export function buildSTRESSSystemPrompt(gradeLevel: GradeLevel, candidateWords: string[]): string {
  const sampleWords = candidateWords.slice(0, 40);
  return `당신은 영어 기초 학력 진단 평가 도구를 개발하는 교육 평가 설계 전문가입니다.
당신의 임무는 강세 및 리듬 패턴 파악 능력을 측정하기 위한 STRESS 평가 문항을 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 STRESS 평가 문항을 생성합니다. 총 20개의 문항으로 구성합니다.

[단어 후보 목록]
- 아래 단어들은 한국 초등 ${gradeLevel} 교육과정(vocabulary_level.json)에서 추출한 고빈도 단어들입니다.
- 반드시 이 목록에서만 단어를 선택하여 사용합니다.
${sampleWords.join(', ')}

[생성 규칙]
1. 단어 선정:
   - 2음절 이상의 단어를 선택합니다.
   - 강세 패턴이 명확한 단어를 사용합니다.

2. 강세 패턴 선택지:
   - 정답: 올바른 강세 패턴 (예: comPUter)
   - 오답 1: 첫 음절에 강세 (예: COMputer)
   - 오답 2: 마지막 음절에 강세 (예: compuTER)

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "STRESS": [
    {
      "word": "computer",
      "choices": ["comPUter", "COMputer", "compuTER"],
      "correctAnswer": "comPUter"
    },
    ...
  ]
}

[최종 검토]
- 강세 패턴이 정확한지 확인한 후 결과만 JSON으로 출력하세요.`;
}

export function buildSTRESSUserPrompt(): string {
  return `STRESS 평가용 문항 20개를 생성하여 "STRESS" 배열에 담아 JSON 객체만 반환하세요.
- 각 항목은 { "word", "choices", "correctAnswer" } 형식이어야 합니다.
- 제공된 후보 단어 목록에서만 선택하세요.`;
}

/**
 * MEANING용 시스템 프롬프트
 */
export function buildMEANINGSystemPrompt(gradeLevel: GradeLevel, candidateWords: string[]): string {
  const sampleWords = candidateWords.slice(0, 40);
  return `당신은 영어 기초 학력 진단 평가 도구를 개발하는 교육 평가 설계 전문가입니다.
당신의 임무는 의미 이해 능력을 측정하기 위한 MEANING 평가 문항을 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 MEANING 평가 문항을 생성합니다. 총 20개의 문항으로 구성합니다.

[단어 후보 목록]
- 아래 단어들은 한국 초등 ${gradeLevel} 교육과정(vocabulary_level.json)에서 추출한 고빈도 단어들입니다.
- 반드시 이 목록에서만 단어를 선택하여 사용합니다.
${sampleWords.join(', ')}

[생성 규칙]
1. 문항 구성:
   - 단어나 간단한 어구를 제시합니다 (예: "a red apple", "three cats").
   - 3개의 그림 선택지를 제공합니다.

2. 선택지 구성:
   - 정답: 제시된 단어/어구와 일치하는 그림
   - 오답 1: 관련 있지만 다른 그림 (예: "red apple" → "yellow banana")
   - 오답 2: 관련 없는 그림 (예: "red apple" → "blue ball")

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "MEANING": [
    {
      "wordOrPhrase": "a red apple",
      "imageOptions": ["red apple", "yellow banana", "green grape"],
      "correctAnswer": "red apple"
    },
    ...
  ]
}

[최종 검토]
- 단어/어구와 그림 선택지가 적절한지 확인한 후 결과만 JSON으로 출력하세요.`;
}

export function buildMEANINGUserPrompt(): string {
  return `MEANING 평가용 문항 20개를 생성하여 "MEANING" 배열에 담아 JSON 객체만 반환하세요.
- 각 항목은 { "wordOrPhrase", "imageOptions", "correctAnswer" } 형식이어야 합니다.
- 제공된 후보 단어 목록에서만 선택하세요.`;
}

/**
 * COMPREHENSION용 시스템 프롬프트
 */
export function buildCOMPREHENSIONSystemPrompt(gradeLevel: GradeLevel, coreExpressions: string[]): string {
  const sample = coreExpressions.slice(0, 40);
  return `당신은 영어 기초 학력 진단 평가 도구를 개발하는 교육 평가 설계 전문가입니다.
당신의 임무는 주요 정보 파악 능력을 측정하기 위한 COMPREHENSION 평가 문항을 생성하는 것입니다.

[핵심 목표]
- 초등학생을 위한 COMPREHENSION 평가 문항을 생성합니다. 총 15개의 문항으로 구성합니다.

[핵심 표현 목록]
- 아래 표현들은 한국 초등 ${gradeLevel} 교육과정(core_expressions.json)에서 추출한 핵심 표현들입니다.
- 반드시 이 표현들을 활용하여 대화나 이야기를 구성합니다.
${sample.join(' ')}

[생성 규칙]
1. 대화/이야기 구성:
   - 매우 쉽고 간단한 대화나 이야기를 작성합니다.
   - 모습, 크기, 색깔, 인물 등에 대한 정보를 포함합니다.

2. 질문 구성:
   - 대화/이야기에서 언급된 주요 정보에 대한 질문을 작성합니다.
   - 예: "What color is the ball?", "How big is the dog?"

3. 선택지 구성:
   - 정답: 대화/이야기에서 언급된 정보와 일치
   - 오답 1-2: 관련 있지만 다른 정보

[출력 형식]
- JSON 객체만 반환합니다.
- 예시:
{
  "COMPREHENSION": [
    {
      "dialogueOrStory": "This is my friend, Tom. He has a big, blue ball.",
      "question": "What color is the ball?",
      "options": [
        { "type": "word", "content": "blue" },
        { "type": "word", "content": "red" },
        { "type": "word", "content": "yellow" }
      ],
      "correctAnswer": "blue"
    },
    ...
  ]
}

[최종 검토]
- core_expressions 기반 표현 사용 여부와 질문-답변의 적절성을 확인한 후 결과만 JSON으로 출력하세요.`;
}

export function buildCOMPREHENSIONUserPrompt(): string {
  return `COMPREHENSION 평가용 문항 15개를 생성하여 "COMPREHENSION" 배열에 담아 JSON 객체만 반환하세요.
- 각 항목은 { "dialogueOrStory", "question", "options", "correctAnswer" } 형식이어야 합니다.
- core_expressions 기반 표현을 활용하여 대화/이야기를 구성하세요.`;
}

/**
 * 평가 유형별 공용 system 프롬프트 선택기
 * - 필요 시 Orchestrator/Validator 등에서 재사용 가능하도록 타입 제공
 */
export function buildSystemPromptForTestType(
  testType: TestType,
  gradeLevel: GradeLevel,
  options: {
    candidateWords?: string[];
    coreExpressions?: string[];
  } = {}
): string {
  const { candidateWords = [], coreExpressions = [] } = options;

  switch (testType) {
    case 'LNF':
      return buildLNFSystemPrompt();
    case 'PSF':
      return buildPSFSystemPrompt(gradeLevel, candidateWords);
    case 'NWF':
      return buildNWFSystemPrompt();
    case 'WRF':
      return buildWRFSystemPrompt(gradeLevel, candidateWords);
    case 'ORF':
      return buildORFSystemPrompt(gradeLevel, coreExpressions);
    case 'STRESS':
      return buildSTRESSSystemPrompt(gradeLevel, candidateWords);
    case 'MEANING':
      return buildMEANINGSystemPrompt(gradeLevel, candidateWords);
    case 'COMPREHENSION':
      return buildCOMPREHENSIONSystemPrompt(gradeLevel, coreExpressions);
    default:
      return '';
  }
}



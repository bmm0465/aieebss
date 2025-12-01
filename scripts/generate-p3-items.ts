/**
 * 3교시 문항 생성 스크립트
 * 무의미 단어(CVC) => 천재교과서(함) 단어 => 핵심 표현 문장 순서로 반복
 */

import fs from 'fs';
import path from 'path';

// 이미지에서 추출한 CVC 무의미 단어 목록
const getCVCWords = (): string[] => {
  // 이미지 그리드에서 추출한 무의미 단어 (15행 x 5열 = 75개)
  return [
    // Column 1
    'sep', 'het', 'tum', 'lut', 'dit', 'reg', 'fet', 'pom', 'teb', 'gid', 'wap', 'vom', 'yod', 'kom', 'vid',
    // Column 2
    'rop', 'dem', 'nep', 'nem', 'sem', 'yan', 'yit', 'pim', 'hib', 'seb', 'yad', 'wod', 'vut', 'pag', 'vun',
    // Column 3
    'lan', 'som', 'nop', 'san', 'rin', 'yed', 'fem', 'mem', 'sud', 'vad', 'lem', 'fub', 'wid', 'wim', 'yab',
    // Column 4
    'tup', 'tig', 'lun', 'dut', 'nam', 'tud', 'rud', 'dap', 'pid', 'mig', 'yun', 'mip', 'wem', 'dob', 'pob',
    // Column 5
    'nen', 'nup', 'hon', 'nin', 'fon', 'dib', 'seg', 'nud', 'gim', 'yom', 'reb', 'wum', 'kun', 'bim', 'vot',
  ];
};

// vocabulary_level.json에서 천재교과서(함) 단어 추출
// 1글자 단어는 제외 (알파벳과 겹치므로)
function loadChunjaeTextHamWords(): string[] {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'vocabulary_level.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const words: string[] = [];
    
    for (const unit of data.units) {
      for (const entry of unit.entries) {
        const publisherValue = entry.chunjae_text_ham;
        if (typeof publisherValue === 'string' && publisherValue.trim().length > 0) {
          const tokens = publisherValue
            .split(/[\/(),]/)
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 1); // 2글자 이상만 포함 (1글자 제외)
          words.push(...tokens);
        }
      }
    }
    
    return Array.from(new Set(words)).sort();
  } catch (error) {
    console.error('vocabulary_level.json 로드 오류:', error);
    return [];
  }
}

// core_expressions.json에서 천재교과서(함) 핵심 표현 추출
// 최소 2~3개 단어 이상인 문장만 포함
function loadChunjaeTextHamExpressions(): string[] {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'core_expressions.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const expressions: string[] = [];
    
    for (const unit of data.units) {
      for (const entry of unit.entries) {
        const publisherValue = entry.chunjae_text_ham;
        if (typeof publisherValue === 'string' && publisherValue.trim().length > 0) {
          // "Hi. / Hello." 같은 형태는 분리
          const tokens = publisherValue
            .split('/')
            .map((t: string) => t.trim().replace(/\.$/, '')) // 마지막 마침표 제거
            .filter((t: string) => t.length > 0);
          expressions.push(...tokens);
        }
      }
    }
    
    // 최소 2개 단어 이상인 문장만 필터링
    const filteredExpressions = Array.from(new Set(expressions))
      .filter(expr => {
        const wordCount = expr.trim().split(/\s+/).length;
        return wordCount >= 2; // 최소 2개 단어 이상
      });
    
    return filteredExpressions;
  } catch (error) {
    console.error('core_expressions.json 로드 오류:', error);
    return [];
  }
}

// 3교시 문항 생성
function generateP3Items() {
  const cvcWords = getCVCWords();
  const chunjaeWords = loadChunjaeTextHamWords();
  const chunjaeExpressions = loadChunjaeTextHamExpressions();
  
  console.log('📊 데이터 로드 완료:');
  console.log(`  - CVC 무의미 단어: ${cvcWords.length}개`);
  console.log(`  - 천재교과서(함) 단어: ${chunjaeWords.length}개`);
  console.log(`  - 천재교과서(함) 핵심 표현: ${chunjaeExpressions.length}개\n`);
  
  const items: Array<{ type: 'nonsense' | 'word' | 'sentence'; content: string }> = [];
  
  // 순서대로 반복: 무의미 단어 => 단어 => 문장
  const maxCycles = Math.min(
    Math.floor(cvcWords.length / 1),
    Math.floor(chunjaeWords.length / 1),
    Math.floor(chunjaeExpressions.length / 1)
  );
  
  for (let i = 0; i < maxCycles && items.length < 30; i++) {
    // 1. 무의미 단어 (CVC)
    if (cvcWords[i]) {
      items.push({ type: 'nonsense', content: cvcWords[i] });
    }
    
    // 2. 천재교과서(함) 단어
    if (chunjaeWords[i]) {
      items.push({ type: 'word', content: chunjaeWords[i] });
    }
    
    // 3. 천재교과서(함) 핵심 표현 문장
    if (chunjaeExpressions[i]) {
      items.push({ type: 'sentence', content: chunjaeExpressions[i] });
    }
  }
  
  console.log(`✅ 총 ${items.length}개 문항 생성 완료\n`);
  console.log('📝 생성된 문항 목록:');
  console.log('='.repeat(60));
  
  items.forEach((item, index) => {
    const typeLabel = item.type === 'nonsense' ? '무의미 단어' : item.type === 'word' ? '단어' : '문장';
    console.log(`${index + 1}. [${typeLabel}] ${item.content}`);
  });
  
  console.log('='.repeat(60));
  
  // JSON 파일로 저장
  const outputPath = path.join(process.cwd(), 'public', 'data', 'p3_items.json');
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`\n💾 문항 데이터 저장: ${outputPath}`);
  
  return items;
}

// 실행
generateP3Items();


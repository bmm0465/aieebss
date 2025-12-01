/**
 * 4교시(p4_phonics) 문항 생성 스크립트
 * 무의미 단어 => 단어 => 문장 보고 읽기
 * 
 * 구성:
 * - NWF: 무의미 단어 (CVC)
 * - WRF: 천재교과서(함) 단어 (2글자 이상)
 * - ORF: 천재교과서(함) 핵심 표현 문장 (2개 단어 이상)
 * 
 * 순서: 무의미 단어 => 단어 => 문장 순서로 반복
 */

import fs from 'fs';
import path from 'path';

// 이미지에서 추출한 CVC 무의미 단어 목록
const getCVCWords = (): string[] => {
  return [
    'sep', 'het', 'tum', 'lut', 'dit', 'reg', 'fet', 'pom', 'teb', 'gid',
    'wap', 'vom', 'yod', 'kom', 'vid', 'rop', 'dem', 'nep', 'nem', 'sem',
    'yan', 'yit', 'pim', 'hib', 'seb', 'yad', 'wod', 'vut', 'pag', 'vun',
  ];
};

// vocabulary_level.json에서 천재교과서(함) 단어 추출
// 2글자 이상만 포함
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
            .filter((t: string) => t.length > 1); // 2글자 이상만
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
// 최소 2개 단어 이상인 문장만 포함
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
          const tokens = publisherValue
            .split('/')
            .map((t: string) => t.trim().replace(/\.$/, ''))
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

// 4교시 문항 생성 (무의미 단어 => 단어 => 문장 순서)
function generateP4Items() {
  const cvcWords = getCVCWords();
  const chunjaeWords = loadChunjaeTextHamWords();
  const chunjaeExpressions = loadChunjaeTextHamExpressions();
  
  console.log('📊 데이터 로드 완료:');
  console.log(`  - CVC 무의미 단어: ${cvcWords.length}개`);
  console.log(`  - 천재교과서(함) 단어: ${chunjaeWords.length}개`);
  console.log(`  - 천재교과서(함) 핵심 표현: ${chunjaeExpressions.length}개\n`);
  
  // 순서대로 반복: 무의미 단어 => 단어 => 문장
  const maxCycles = Math.min(
    Math.floor(cvcWords.length / 1),
    Math.floor(chunjaeWords.length / 1),
    Math.floor(chunjaeExpressions.length / 1)
  );
  
  const nwfItems: string[] = [];
  const wrfItems: string[] = [];
  const orfItems: string[] = [];
  
  for (let i = 0; i < maxCycles && (nwfItems.length + wrfItems.length + orfItems.length) < 30; i++) {
    // 1. 무의미 단어 (CVC)
    if (cvcWords[i]) {
      nwfItems.push(cvcWords[i]);
    }
    
    // 2. 천재교과서(함) 단어
    if (chunjaeWords[i]) {
      wrfItems.push(chunjaeWords[i]);
    }
    
    // 3. 천재교과서(함) 핵심 표현 문장
    if (chunjaeExpressions[i]) {
      orfItems.push(chunjaeExpressions[i]);
    }
  }
  
  const items = {
    nwf: nwfItems.slice(0, 10),
    wrf: wrfItems.slice(0, 10),
    orf: orfItems.slice(0, 10),
  };
  
  console.log(`✅ 총 문항 생성 완료:`);
  console.log(`  - NWF (무의미 단어): ${items.nwf.length}개`);
  console.log(`  - WRF (단어): ${items.wrf.length}개`);
  console.log(`  - ORF (문장): ${items.orf.length}개\n`);
  
  console.log('📝 생성된 문항 목록:');
  console.log('='.repeat(60));
  console.log('\n[NWF - 무의미 단어]');
  items.nwf.forEach((word, index) => {
    console.log(`  ${index + 1}. ${word}`);
  });
  
  console.log('\n[WRF - 단어 (천재교과서 함)]');
  items.wrf.forEach((word, index) => {
    console.log(`  ${index + 1}. ${word}`);
  });
  
  console.log('\n[ORF - 문장 (천재교과서 함)]');
  items.orf.forEach((sentence, index) => {
    const wordCount = sentence.trim().split(/\s+/).length;
    console.log(`  ${index + 1}. ${sentence} (${wordCount}개 단어)`);
  });
  
  console.log('='.repeat(60));
  
  // JSON 파일로 저장
  const outputPath = path.join(process.cwd(), 'public', 'data', 'p4_items.json');
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`\n💾 문항 데이터 저장: ${outputPath}`);
  
  return items;
}

// 실행
generateP4Items();

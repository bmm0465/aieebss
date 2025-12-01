/**
 * 천재교과서(함) 어휘 목록에서 최소대립쌍(minimal pair) 분석 스크립트
 * 
 * 최소대립쌍: 한 음소만 다른 두 단어
 * 예: cat / bat, pin / bin, sit / set
 * 
 * 사용법:
 * npx tsx scripts/analyze-minimal-pairs.ts
 */

import fs from 'fs';
import path from 'path';

/**
 * vocabulary_level.json에서 천재교과서(함)의 모든 단어 추출
 */
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
          // "hello(hi)" / "goodbye/bye" 같은 형태는 토큰으로 분리
          const tokens = publisherValue
            .split(/[\/(),]/)
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0);
          words.push(...tokens);
        }
      }
    }
    
    // 중복 제거 및 정렬
    const unique = Array.from(new Set(words));
    return unique.sort();
  } catch (error) {
    console.error('vocabulary_level.json 로드 오류:', error);
    return [];
  }
}

/**
 * 두 단어가 철자 기준으로 최소대립쌍인지 확인
 * (한 글자만 다른 경우)
 */
function isMinimalPairBySpelling(word1: string, word2: string): boolean {
  if (word1.length !== word2.length) {
    return false;
  }
  
  let diffCount = 0;
  for (let i = 0; i < word1.length; i++) {
    if (word1[i].toLowerCase() !== word2[i].toLowerCase()) {
      diffCount++;
    }
  }
  
  return diffCount === 1;
}

/**
 * 두 단어가 음소 기준으로 최소대립쌍인지 확인
 * (간단한 발음 규칙 기반)
 * 
 * 주의: 정확한 음소 분석을 위해서는 음성학 라이브러리가 필요하지만,
 * 여기서는 일반적인 영어 발음 규칙을 기반으로 간단히 판단합니다.
 */
function getPhonemes(word: string): string[] {
  // 간단한 음소 추출 (정확하지 않지만 기본적인 패턴 인식)
  // 실제로는 CMU Pronouncing Dictionary 같은 리소스가 필요함
  const phonemes: string[] = [];
  const lower = word.toLowerCase();
  
  for (let i = 0; i < lower.length; i++) {
    const char = lower[i];
    const next = lower[i + 1];
    const prev = lower[i - 1];
    
    // 이중자음 처리
    if (char === 'c' && next === 'h') {
      phonemes.push('ch');
      i++;
      continue;
    }
    if (char === 's' && next === 'h') {
      phonemes.push('sh');
      i++;
      continue;
    }
    if (char === 't' && next === 'h') {
      phonemes.push('th');
      i++;
      continue;
    }
    if (char === 'p' && next === 'h') {
      phonemes.push('ph');
      i++;
      continue;
    }
    
    // 단일 문자
    phonemes.push(char);
  }
  
  return phonemes;
}

/**
 * 두 단어가 음소 기준으로 최소대립쌍인지 확인
 */
function isMinimalPairByPhoneme(word1: string, word2: string): boolean {
  const phonemes1 = getPhonemes(word1);
  const phonemes2 = getPhonemes(word2);
  
  if (phonemes1.length !== phonemes2.length) {
    return false;
  }
  
  let diffCount = 0;
  for (let i = 0; i < phonemes1.length; i++) {
    if (phonemes1[i] !== phonemes2[i]) {
      diffCount++;
    }
  }
  
  return diffCount === 1;
}

/**
 * 최소대립쌍 찾기
 */
function findMinimalPairs(words: string[]): Array<{ word1: string; word2: string; type: 'spelling' | 'phoneme' }> {
  const pairs: Array<{ word1: string; word2: string; type: 'spelling' | 'phoneme' }> = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      const word1 = words[i];
      const word2 = words[j];
      
      // 이미 처리한 쌍인지 확인 (순서 무관)
      const pairKey = `${word1}-${word2}`;
      const reverseKey = `${word2}-${word1}`;
      if (processed.has(pairKey) || processed.has(reverseKey)) {
        continue;
      }
      
      // 철자 기준 최소대립쌍 확인
      if (isMinimalPairBySpelling(word1, word2)) {
        pairs.push({ word1, word2, type: 'spelling' });
        processed.add(pairKey);
        continue;
      }
      
      // 음소 기준 최소대립쌍 확인 (철자 기준이 아닌 경우)
      if (isMinimalPairByPhoneme(word1, word2)) {
        pairs.push({ word1, word2, type: 'phoneme' });
        processed.add(pairKey);
      }
    }
  }
  
  return pairs;
}

/**
 * 메인 분석 함수
 */
function analyzeMinimalPairs() {
  console.log('🔍 천재교과서(함) 어휘 목록에서 최소대립쌍 분석 시작...\n');
  
  const words = loadChunjaeTextHamWords();
  console.log(`📚 총 어휘 개수: ${words.length}개\n`);
  
  if (words.length === 0) {
    console.error('❌ 단어를 찾을 수 없습니다.');
    return;
  }
  
  // 최소대립쌍 찾기
  console.log('🔎 최소대립쌍 검색 중...');
  const pairs = findMinimalPairs(words);
  
  // 결과 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 분석 결과');
  console.log('='.repeat(60));
  console.log(`총 최소대립쌍 개수: ${pairs.length}개\n`);
  
  if (pairs.length === 0) {
    console.log('최소대립쌍을 찾을 수 없습니다.');
    return;
  }
  
  // 철자 기준과 음소 기준으로 분류
  const spellingPairs = pairs.filter(p => p.type === 'spelling');
  const phonemePairs = pairs.filter(p => p.type === 'phoneme');
  
  console.log(`📝 철자 기준 최소대립쌍: ${spellingPairs.length}개`);
  console.log(`🔊 음소 기준 최소대립쌍: ${phonemePairs.length}개\n`);
  
  // 철자 기준 최소대립쌍 출력
  if (spellingPairs.length > 0) {
    console.log('📝 철자 기준 최소대립쌍 목록:');
    console.log('-'.repeat(60));
    spellingPairs.forEach((pair, index) => {
      const diffIndex = findDifferentIndex(pair.word1, pair.word2);
      const diff1 = pair.word1[diffIndex] || '';
      const diff2 = pair.word2[diffIndex] || '';
      console.log(`${index + 1}. ${pair.word1} / ${pair.word2} (${diff1} ↔ ${diff2})`);
    });
    console.log('');
  }
  
  // 음소 기준 최소대립쌍 출력 (철자 기준이 아닌 경우)
  if (phonemePairs.length > 0) {
    console.log('🔊 음소 기준 최소대립쌍 목록 (철자 기준 제외):');
    console.log('-'.repeat(60));
    phonemePairs.forEach((pair, index) => {
      console.log(`${index + 1}. ${pair.word1} / ${pair.word2}`);
    });
    console.log('');
  }
  
  // 통계 정보
  console.log('📈 통계:');
  console.log('-'.repeat(60));
  const wordLengths = new Map<number, number>();
  pairs.forEach(pair => {
    const len = pair.word1.length;
    wordLengths.set(len, (wordLengths.get(len) || 0) + 1);
  });
  
  const sortedLengths = Array.from(wordLengths.entries()).sort((a, b) => a[0] - b[0]);
  sortedLengths.forEach(([length, count]) => {
    console.log(`  ${length}글자 단어 쌍: ${count}개`);
  });
  
  console.log('\n' + '='.repeat(60));
}

/**
 * 두 단어에서 다른 위치 찾기
 */
function findDifferentIndex(word1: string, word2: string): number {
  for (let i = 0; i < Math.min(word1.length, word2.length); i++) {
    if (word1[i].toLowerCase() !== word2[i].toLowerCase()) {
      return i;
    }
  }
  return -1;
}

// 실행
analyzeMinimalPairs();


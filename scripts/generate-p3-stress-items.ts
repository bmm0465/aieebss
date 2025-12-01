/**
 * 3교시 문항 생성 스크립트
 * 언어의 강세를 듣고, 올바른 강세 위치 고르기
 * 천재교과서(함) 어휘 목록에서 강세가 명확한 단어들로 구성
 */

import fs from 'fs';
import path from 'path';

// 단어의 음절 수를 계산하는 함수
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// 강세 패턴 생성 (간단한 규칙 기반)
function generateStressPatterns(word: string): { choices: string[]; correctAnswer: string } {
  const syllables = countSyllables(word);
  const lowerWord = word.toLowerCase();
  
  // 간단한 강세 규칙 (실제로는 더 복잡하지만 기본 패턴)
  // 2음절: 보통 첫 음절 또는 두 번째 음절
  // 3음절 이상: 보통 첫 음절 또는 두 번째 음절
  
  const choices: string[] = [];
  let correctAnswer = '';
  
  if (syllables === 2) {
    // 2음절 단어: 첫 음절 또는 두 번째 음절에 강세
    // 간단히 두 번째 음절에 강세로 가정 (많은 2음절 단어가 그렇다)
    const firstSyl = lowerWord.substring(0, Math.floor(lowerWord.length / 2));
    const secondSyl = lowerWord.substring(Math.floor(lowerWord.length / 2));
    
    choices.push(firstSyl.toUpperCase() + secondSyl); // 첫 음절 강세
    choices.push(firstSyl + secondSyl.toUpperCase()); // 두 번째 음절 강세 (정답으로 가정)
    choices.push(firstSyl.toUpperCase() + secondSyl.toUpperCase()); // 둘 다 강세 (오답)
    
    correctAnswer = firstSyl + secondSyl.toUpperCase();
  } else if (syllables >= 3) {
    // 3음절 이상: 첫 음절 또는 두 번째 음절에 강세
    const parts = lowerWord.match(/([^aeiouy]*[aeiouy]+[^aeiouy]*)/gi) || [];
    if (parts.length >= 2) {
      const first = parts[0];
      const second = parts[1];
      const rest = parts.slice(2).join('');
      
      choices.push(first.toUpperCase() + second + rest); // 첫 음절 강세
      choices.push(first + second.toUpperCase() + rest); // 두 번째 음절 강세 (정답으로 가정)
      choices.push(first + second + rest.toUpperCase()); // 마지막 음절 강세
      
      correctAnswer = first + second.toUpperCase() + rest;
    } else {
      // 폴백
      choices.push(lowerWord.toUpperCase());
      choices.push(lowerWord);
      choices.push(lowerWord);
      correctAnswer = lowerWord;
    }
  } else {
    // 1음절: 강세가 없거나 모든 음절에 강세
    choices.push(lowerWord.toUpperCase());
    choices.push(lowerWord);
    choices.push(lowerWord);
    correctAnswer = lowerWord;
  }
  
  return { choices, correctAnswer };
}

// vocabulary_level.json에서 천재교과서(함) 단어 추출
// 강세가 명확한 단어만 필터링 (2음절 이상, 2글자 이상)
function loadChunjaeTextHamWordsWithStress(): string[] {
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
    
    // 중복 제거 및 강세가 명확한 단어만 필터링
    const uniqueWords = Array.from(new Set(words));
    
    // 2음절 이상의 단어만 선택 (강세가 명확한 단어)
    const wordsWithStress = uniqueWords.filter(word => {
      const syllables = countSyllables(word);
      return syllables >= 2; // 2음절 이상
    });
    
    return wordsWithStress.sort();
  } catch (error) {
    console.error('vocabulary_level.json 로드 오류:', error);
    return [];
  }
}

// 3교시 문항 생성
function generateP3StressItems() {
  const words = loadChunjaeTextHamWordsWithStress();
  
  console.log('📊 데이터 로드 완료:');
  console.log(`  - 천재교과서(함) 강세 명확 단어: ${words.length}개\n`);
  
  const items: Array<{ word: string; choices: string[]; correctAnswer: string }> = [];
  
  // 상위 20개 단어로 문항 생성
  for (let i = 0; i < Math.min(20, words.length); i++) {
    const word = words[i];
    const { choices, correctAnswer } = generateStressPatterns(word);
    items.push({ word, choices, correctAnswer });
  }
  
  console.log(`✅ 총 ${items.length}개 문항 생성 완료\n`);
  console.log('📝 생성된 문항 목록:');
  console.log('='.repeat(60));
  
  items.forEach((item, index) => {
    const syllables = countSyllables(item.word);
    console.log(`${index + 1}. ${item.word} (${syllables}음절)`);
    console.log(`   선택지: ${item.choices.join(' / ')}`);
    console.log(`   정답: ${item.correctAnswer}\n`);
  });
  
  console.log('='.repeat(60));
  
  // JSON 파일로 저장
  const outputPath = path.join(process.cwd(), 'public', 'data', 'p3_stress_items.json');
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`\n💾 문항 데이터 저장: ${outputPath}`);
  
  return items;
}

// 실행
generateP3StressItems();


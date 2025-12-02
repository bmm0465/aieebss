/**
 * 6교시(p6_comprehension) 문항 생성 스크립트
 * 
 * 평가 목표: 자기 주변 주제에 관한 매우 쉽고 간단한 말이나 대화를 반복하여 듣거나 읽고,
 * 도움 자료를 사용하여 모습, 크기, 색깔, 인물 등에 대한 주요 정보를 단어 수준으로 파악할 수 있다.
 * 
 * 문항 유형: 선다형 (그림 선택)
 * 평가 요소: 사물의 색깔, 크기, 모습을 묘사하는 말을 듣고 대상을 식별하기
 * 
 * 천재교과서(함) 핵심 표현 활용:
 * - 색깔: "What color is it?", "It's red/blue/green/pink/yellow."
 * - 크기: "It's big.", "It's small."
 * - 모습: "He's tall.", "She's tall.", "She's pretty."
 */

import fs from 'fs';
import path from 'path';

// vocabulary_level.json에서 천재교과서(함) 단어 추출 (사물명)
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
            .filter((t: string) => t.length > 1);
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
    
    return Array.from(new Set(expressions));
  } catch (error) {
    console.error('core_expressions.json 로드 오류:', error);
    return [];
  }
}

// 색깔 관련 표현 추출
function extractColorExpressions(expressions: string[]): string[] {
  const colorKeywords = ['color', 'red', 'blue', 'green', 'yellow', 'pink', 'black', 'white', 'orange', 'purple'];
  return expressions.filter(expr => 
    colorKeywords.some(keyword => expr.toLowerCase().includes(keyword))
  );
}

// 크기 관련 표현 추출
function extractSizeExpressions(expressions: string[]): string[] {
  const sizeKeywords = ['big', 'small', 'tall', 'short'];
  return expressions.filter(expr => 
    sizeKeywords.some(keyword => expr.toLowerCase().includes(keyword))
  );
}

// 모습 관련 표현 추출
function extractAppearanceExpressions(expressions: string[]): string[] {
  const appearanceKeywords = ['tall', 'pretty', 'nice', 'cute', 'cool'];
  return expressions.filter(expr => 
    appearanceKeywords.some(keyword => expr.toLowerCase().includes(keyword))
  );
}

// 문항 생성
interface P6Item {
  id: string;
  question: string;
  script: {
    speaker1: string;
    speaker2: string;
  };
  options: Array<{
    number: number;
    description: string;
    isCorrect: boolean;
  }>;
  evaluation: {
    target: string; // 평가 목표 (색깔/크기/모습)
    description: string;
  };
}

// 색깔 한글 변환
function getColorKorean(color: string): string {
  const colorMap: Record<string, string> = {
    'red': '빨간',
    'blue': '파란',
    'green': '초록',
    'yellow': '노란',
    'pink': '분홍',
    'black': '검은',
    'white': '하얀',
    'orange': '주황',
    'purple': '보라'
  };
  return colorMap[color.toLowerCase()] || color;
}

// 크기 한글 변환
function getSizeKorean(size: string): string {
  const sizeMap: Record<string, string> = {
    'big': '큰',
    'small': '작은',
    'tall': '큰',
    'short': '작은'
  };
  return sizeMap[size.toLowerCase()] || size;
}

// 사물 한글 변환 (일부)
function getObjectKorean(object: string): string {
  const objectMap: Record<string, string> = {
    'bag': '가방',
    'ball': '공',
    'book': '책',
    'pencil': '연필',
    'cup': '컵',
    'hat': '모자',
    'car': '자동차',
    'cat': '고양이',
    'dog': '강아지',
    'apple': '사과',
    'banana': '바나나',
    'orange': '오렌지',
    'pen': '펜',
    'doll': '인형',
    'robot': '로봇',
    'bike': '자전거',
    'flower': '꽃',
    'box': '상자',
    'egg': '달걀',
    'fish': '물고기',
    'lion': '사자',
    'monkey': '원숭이',
    'panda': '판다',
    'tiger': '호랑이',
    'zebra': '얼룩말',
    'bird': '새',
    'duck': '오리',
    'pig': '돼지',
    'cow': '소',
    'chicken': '닭',
    'elephant': '코끼리',
    'rabbit': '토끼',
    'bear': '곰',
    'piano': '피아노',
    'violin': '바이올린',
    'umbrella': '우산',
    'crayon': '크레용',
    'eraser': '지우개',
    'ruler': '자',
    'tape': '테이프',
    'brush': '붓',
    'pencil': '연필',
    'pen': '펜'
  };
  return objectMap[object.toLowerCase()] || object;
}

function generateP6Items(): P6Item[] {
  const words = loadChunjaeTextHamWords();
  const expressions = loadChunjaeTextHamExpressions();
  
  const colorExpressions = extractColorExpressions(expressions);
  const sizeExpressions = extractSizeExpressions(expressions);
  const appearanceExpressions = extractAppearanceExpressions(expressions);
  
  console.log('📊 데이터 로드 완료:');
  console.log(`  - 단어: ${words.length}개`);
  console.log(`  - 색깔 표현: ${colorExpressions.length}개`);
  console.log(`  - 크기 표현: ${sizeExpressions.length}개`);
  console.log(`  - 모습 표현: ${appearanceExpressions.length}개`);
  
  const items: P6Item[] = [];
  
  // 사용 가능한 사물 단어 (그림으로 표현 가능한 것들)
  const objectWords = words.filter(word => {
    const lowerWord = word.toLowerCase();
    // 동사나 추상적인 단어 제외
    const excludedWords = ['be', 'am', 'is', 'are', 'have', 'has', 'do', 'does', 'can', 'will', 
      'like', 'look', 'come', 'go', 'sit', 'stand', 'jump', 'run', 'dance', 'sing', 'swim', 
      'skate', 'ski', 'climb', 'fly', 'walk', 'thank', 'sorry', 'okay', 'nice', 'great', 
      'good', 'fine', 'how', 'what', 'who', 'where', 'when', 'why', 'here', 'there', 'now',
      'yes', 'no', 'not', 'very', 'too', 'also', 'well', 'just', 'only', 'even', 'still',
      'please', 'welcome', 'goodbye', 'hello', 'hi', 'bye', 'meet', 'name', 'everyone',
      'close', 'open', 'down', 'up', 'in', 'out', 'on', 'at', 'for', 'with', 'by', 'from',
      'to', 'of', 'about', 'over', 'under', 'into', 'onto', 'through', 'across', 'between',
      'among', 'during', 'before', 'after', 'since', 'until', 'within', 'and', 'or', 'but',
      'so', 'because', 'if', 'when', 'while', 'though', 'although', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'this', 'that', 'these', 'those', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours',
      'theirs', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'yourselves',
      'themselves', 'was', 'were', 'been', 'being', 'could', 'would', 'should', 'shall', 'may',
      'might', 'must', 'did', 'done', 'doing', 'had', 'having', 'then', 'yet', 'oh', 'thanks',
      'which', 'whose', 'whom', 'many', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
      'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
      'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty',
      'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'million', 'billion', 'first',
      'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    return !excludedWords.includes(lowerWord) && lowerWord.length > 1;
  });
  
  console.log(`  - 사용 가능한 사물 단어: ${objectWords.length}개\n`);
  
  // 색깔 목록
  const colors = ['red', 'blue', 'green', 'yellow', 'pink', 'black', 'white', 'orange', 'purple'];
  const availableColors = colors.filter(c => 
    colorExpressions.some(expr => expr.toLowerCase().includes(c)) || 
    ['red', 'blue', 'green', 'yellow', 'pink'].includes(c) // 기본 색깔은 항상 사용 가능
  );
  
  // 크기 목록
  const sizes = ['big', 'small'];
  
  // 다양한 사물과 색깔, 크기 조합으로 문항 생성
  let itemCount = 0;
  const usedCombinations = new Set<string>();
  
  // 사물별로 여러 문항 생성
  const commonObjects = ['bag', 'ball', 'book', 'pencil', 'cup', 'hat', 'car', 'cat', 'dog', 
    'apple', 'banana', 'orange', 'pen', 'doll', 'robot', 'bike', 'flower', 'box', 'egg', 
    'fish', 'lion', 'monkey', 'panda', 'tiger', 'zebra', 'bird', 'duck', 'pig', 'cow', 
    'chicken', 'elephant', 'rabbit', 'bear', 'piano', 'violin', 'umbrella', 'crayon', 
    'eraser', 'ruler', 'tape', 'brush'];
  
  const availableObjects = commonObjects.filter(obj => objectWords.includes(obj));
  
  // 색깔 + 크기 조합 문항 생성 (최대 30개)
  for (const object of availableObjects.slice(0, 15)) {
    for (let i = 0; i < 2 && itemCount < 30; i++) {
      const colorIndex = itemCount % availableColors.length;
      const wrongColorIndex = (itemCount + 1) % availableColors.length;
      const correctColor = availableColors[colorIndex];
      const wrongColor = availableColors[wrongColorIndex];
      const correctSize = sizes[itemCount % 2];
      const wrongSize = sizes[(itemCount + 1) % 2];
      
      const combinationKey = `${object}_${correctColor}_${correctSize}`;
      if (usedCombinations.has(combinationKey)) continue;
      usedCombinations.add(combinationKey);
      
      const objectKorean = getObjectKorean(object);
      const colorKorean = getColorKorean(correctColor);
      const wrongColorKorean = getColorKorean(wrongColor);
      const sizeKorean = getSizeKorean(correctSize);
      const wrongSizeKorean = getSizeKorean(wrongSize);
      
      itemCount++;
      items.push({
        id: `p6_color_size_${String(itemCount).padStart(3, '0')}`,
        question: `다음을 듣고, 묘사하는 내용에 알맞은 ${objectKorean}을(를) 고르시오. (들려주는 말은 2회 반복됩니다.)`,
        script: {
          speaker1: `Look at this ${object}.`,
          speaker2: `Wow! It is ${correctSize}. It is ${correctColor}.`
        },
        options: [
          { number: 1, description: `${wrongSizeKorean} ${colorKorean}색 ${objectKorean}`, isCorrect: false },
          { number: 2, description: `${sizeKorean} ${colorKorean}색 ${objectKorean}`, isCorrect: true },
          { number: 3, description: `${sizeKorean} ${wrongColorKorean}색 ${objectKorean}`, isCorrect: false },
          { number: 4, description: `${wrongSizeKorean} ${wrongColorKorean}색 ${objectKorean}`, isCorrect: false }
        ],
        evaluation: {
          target: '색깔과 크기',
          description: '사물의 색깔과 크기를 묘사하는 말을 듣고 대상을 식별할 수 있다.'
        }
      });
    }
  }
  
  // 인물 모습 관련 문항 생성 (5개)
  const peopleDescriptions = [
    { gender: 'he', relation: 'dad', appearance: 'tall', korean: '아버지', appearanceKorean: '키가 큰' },
    { gender: 'she', relation: 'mom', appearance: 'tall', korean: '어머니', appearanceKorean: '키가 큰' },
    { gender: 'he', relation: 'brother', appearance: 'tall', korean: '형/오빠', appearanceKorean: '키가 큰' },
    { gender: 'she', relation: 'sister', appearance: 'pretty', korean: '누나/언니', appearanceKorean: '예쁜' },
    { gender: 'he', relation: 'grandpa', appearance: 'tall', korean: '할아버지', appearanceKorean: '키가 큰' }
  ];
  
  for (let i = 0; i < peopleDescriptions.length && itemCount < 35; i++) {
    const desc = peopleDescriptions[i];
    itemCount++;
    items.push({
      id: `p6_appearance_${String(itemCount).padStart(3, '0')}`,
      question: '다음을 듣고, 묘사하는 내용에 알맞은 인물을 고르시오. (들려주는 말은 2회 반복됩니다.)',
      script: {
        speaker1: `Who is ${desc.gender}?`,
        speaker2: `${desc.gender.charAt(0).toUpperCase() + desc.gender.slice(1)} is my ${desc.relation}. ${desc.gender.charAt(0).toUpperCase() + desc.gender.slice(1)} is ${desc.appearance}.`
      },
      options: [
        { number: 1, description: `${desc.gender === 'he' ? '키가 작은 남자' : '키가 작은 여자'}`, isCorrect: false },
        { number: 2, description: `${desc.gender === 'he' ? desc.appearanceKorean + ' 남자' : desc.appearanceKorean + ' 여자'}`, isCorrect: true },
        { number: 3, description: `${desc.gender === 'he' ? '키가 작은 여자' : '키가 작은 남자'}`, isCorrect: false },
        { number: 4, description: `${desc.gender === 'he' ? '키가 큰 여자' : '키가 큰 남자'}`, isCorrect: false }
      ],
      evaluation: {
        target: '인물의 모습',
        description: '인물의 모습을 묘사하는 말을 듣고 대상을 식별할 수 있다.'
      }
    });
  }
  
  // 색깔만 강조하는 문항 (5개)
  for (let i = 0; i < 5 && itemCount < 40; i++) {
    const object = availableObjects[i + 15] || availableObjects[i];
    const colorIndex = (itemCount + i) % availableColors.length;
    const wrongColorIndex = (itemCount + i + 1) % availableColors.length;
    const correctColor = availableColors[colorIndex];
    const wrongColor = availableColors[wrongColorIndex];
    
    const objectKorean = getObjectKorean(object);
    const colorKorean = getColorKorean(correctColor);
    const wrongColorKorean = getColorKorean(wrongColor);
    
    itemCount++;
    items.push({
      id: `p6_color_only_${String(itemCount).padStart(3, '0')}`,
      question: `다음을 듣고, 묘사하는 내용에 알맞은 ${objectKorean}을(를) 고르시오. (들려주는 말은 2회 반복됩니다.)`,
      script: {
        speaker1: `What color is this ${object}?`,
        speaker2: `It is ${correctColor}.`
      },
      options: [
        { number: 1, description: `${colorKorean}색 ${objectKorean}`, isCorrect: true },
        { number: 2, description: `${wrongColorKorean}색 ${objectKorean}`, isCorrect: false },
        { number: 3, description: `${getColorKorean(availableColors[(colorIndex + 2) % availableColors.length])}색 ${objectKorean}`, isCorrect: false },
        { number: 4, description: `${getColorKorean(availableColors[(colorIndex + 3) % availableColors.length])}색 ${objectKorean}`, isCorrect: false }
      ],
      evaluation: {
        target: '색깔',
        description: '사물의 색깔을 묘사하는 말을 듣고 대상을 식별할 수 있다.'
      }
    });
  }
  
  return items;
}

// 메인 실행
function main() {
  console.log('🎨 6교시 문항 생성 시작...\n');
  
  const items = generateP6Items();
  
  console.log(`\n✅ 총 ${items.length}개 문항 생성 완료\n`);
  
  // JSON 파일로 저장
  const outputPath = path.join(process.cwd(), 'public', 'data', 'p6_items.json');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`📝 문항 파일 저장: ${outputPath}\n`);
  
  // 문항 미리보기
  console.log('📋 생성된 문항 미리보기:\n');
  items.forEach((item, index) => {
    console.log(`${index + 1}. ${item.id}`);
    console.log(`   문제: ${item.question}`);
    console.log(`   대본: ${item.script.speaker1} / ${item.script.speaker2}`);
    console.log(`   정답: ${item.options.find(opt => opt.isCorrect)?.number}번`);
    console.log(`   평가: ${item.evaluation.target} - ${item.evaluation.description}`);
    console.log('');
  });
}

main();


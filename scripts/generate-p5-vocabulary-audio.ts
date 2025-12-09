/**
 * 5교시 어휘 테스트용 TTS 오디오 파일 생성 스크립트
 * 
 * 단어, 어구, 문장에 대한 오디오 파일을 생성합니다.
 * 
 * 사용법:
 * npx tsx scripts/generate-p5-vocabulary-audio.ts
 * 
 * 환경 변수:
 * OPENAI_API_KEY: OpenAI API 키
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// .env.local 파일에서 환경 변수 로드
dotenv.config({ path: '.env.local' });
// .env 파일도 시도
dotenv.config({ path: '.env' });

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
  console.error('   .env.local 또는 .env 파일에 OPENAI_API_KEY를 추가하세요.');
  process.exit(1);
}

console.log('✅ OpenAI API 키 확인됨');

const openai = new OpenAI({
  apiKey: apiKey,
});

// 생성할 단어/어구/문장 목록 (30개)
interface VocabularyItem {
  text: string;
  type: 'word' | 'phrase' | 'sentence';
  questionNumber: number;
}

const VOCABULARY_ITEMS: VocabularyItem[] = [
  { text: 'apple', type: 'word', questionNumber: 1 },
  { text: 'a red apple', type: 'phrase', questionNumber: 2 },
  { text: "It's a robot.", type: 'sentence', questionNumber: 3 },
  { text: 'ball', type: 'word', questionNumber: 4 },
  { text: 'two cows', type: 'phrase', questionNumber: 5 },
  { text: 'Open the door, please.', type: 'sentence', questionNumber: 6 },
  { text: 'bike', type: 'word', questionNumber: 7 },
  { text: 'a big tree', type: 'phrase', questionNumber: 8 },
  { text: 'I have a brush.', type: 'sentence', questionNumber: 9 },
  { text: 'door', type: 'word', questionNumber: 10 },
  { text: 'open the door', type: 'phrase', questionNumber: 11 },
  { text: "It's pink.", type: 'sentence', questionNumber: 12 },
  { text: 'eraser', type: 'word', questionNumber: 13 },
  { text: 'a green book', type: 'phrase', questionNumber: 14 },
  { text: 'I like chicken.', type: 'sentence', questionNumber: 15 },
  { text: 'flower', type: 'word', questionNumber: 16 },
  { text: 'three robots', type: 'phrase', questionNumber: 17 },
  { text: "I don't like carrots.", type: 'sentence', questionNumber: 18 },
  { text: 'chicken', type: 'word', questionNumber: 19 },
  { text: 'a small bird', type: 'phrase', questionNumber: 20 },
  { text: 'I can dance.', type: 'sentence', questionNumber: 21 },
  { text: 'elephant', type: 'word', questionNumber: 22 },
  { text: 'yellow banana', type: 'phrase', questionNumber: 23 },
  { text: 'Put on your coat.', type: 'sentence', questionNumber: 24 },
  { text: 'helmet', type: 'word', questionNumber: 25 },
  { text: 'swim and skate', type: 'phrase', questionNumber: 26 },
  { text: "It's snowing.", type: 'sentence', questionNumber: 27 },
  { text: 'coat', type: 'word', questionNumber: 28 },
  { text: 'cloudy weather', type: 'phrase', questionNumber: 29 },
  { text: 'Sit down, please.', type: 'sentence', questionNumber: 30 },
];

/**
 * 텍스트를 파일명으로 변환 (안전한 파일명 생성)
 */
function textToFileName(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, '') // 특수문자 제거
    .replace(/\s+/g, '_') // 공백을 언더스코어로
    .toLowerCase();
}

/**
 * 특정 항목에 대한 커스텀 발음 지시사항
 */
function getCustomInstructions(item: VocabularyItem): string {
  const textLower = item.text.toLowerCase();
  
  // 관사 'a'를 '어'로 발음하도록 지시
  if (textLower.includes(' a ') || textLower.startsWith('a ')) {
    return "When pronouncing the article 'a', use the schwa sound (uh), not the letter name (ay). Pronounce 'a' as 'uh' like in 'about'.";
  }
  
  // b로 시작하는 단어들
  if (textLower.match(/^b[a-z]+$/)) {
    return "Pronounce the initial 'b' sound very clearly and distinctly. Make sure the 'b' sound is fully articulated with the lips before moving to the rest of the word. The 'b' should be a clear voiced bilabial stop sound.";
  }
  
  // 특정 문제 항목들에 대한 처리
  if (textLower === "elephant") {
    return "Pronounce this word very clearly. Emphasize the 'el' sound at the beginning and make sure the 'ph' sound is clear. Speak slowly and distinctly.";
  }
  
  if (textLower === "eraser") {
    return "Pronounce this word naturally and clearly. The word should sound like 'ih-RAY-ser' with clear emphasis on all syllables. The 'e' at the beginning should sound like 'ih' (short i sound), not 'ee'. The 'r' should be pronounced clearly. Speak at a natural pace, not too fast or too slow.";
  }
  
  if (textLower === "swim and skate") {
    return "Pronounce this phrase slowly and clearly. Make sure to fully articulate 'swim' before moving to 'and skate'. There should be a clear, complete pronunciation of 'swim' without cutting off the ending. Then pronounce 'and skate' distinctly.";
  }
  
  if (textLower === "it's pink" || textLower === "it's pink.") {
    return "Pronounce this sentence clearly and completely. Say 'It's pink' as one complete, clean sentence without any other sounds or interference. Make sure the recording is clear and uninterrupted.";
  }
  
  if (textLower === "it's snowing" || textLower === "it's snowing.") {
    return "Pronounce this sentence clearly and completely. Say 'It's snowing' as one complete, clean sentence without any other sounds or interference. Make sure the recording is clear and uninterrupted.";
  }
  
  if (textLower === "put on your coat" || textLower === "put on your coat.") {
    return "Pronounce this sentence clearly and completely. Make sure to fully articulate the 'p' sound at the beginning of 'put'. The 'p' should be a clear voiceless bilabial stop sound - make sure your lips come together and then release the air for the 'p' sound. Say 'Put on your coat' as one complete, clean sentence without any other sounds or interference. Make sure the recording is clear and uninterrupted.";
  }
  
  return "";
}

/**
 * TTS로 오디오 파일 생성
 */
async function generateAudioFile(
  item: VocabularyItem,
  outputPath: string,
  forceRegenerate: boolean = false
): Promise<boolean> {
  try {
    // 강제 재생성 모드가 아니면 이미 파일이 존재하면 스킵
    if (!forceRegenerate && fs.existsSync(outputPath)) {
      console.log(`⏭️  "${item.text}" (${item.type}, 문항 ${item.questionNumber}) 이미 존재, 스킵`);
      return true;
    }
    
    // 강제 재생성 모드면 기존 파일 삭제
    if (forceRegenerate && fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`🔄 "${item.text}" 기존 파일 삭제 후 재생성...`);
    }

    console.log(`⏳ "${item.text}" (${item.type}, 문항 ${item.questionNumber}) 생성 중...`);
    
    // 타입에 따라 기본 instructions 생성
    let instruction: string;
    if (item.type === 'word') {
      instruction = "Pronounce this word slowly and clearly. This is for beginner English learners. Emphasize each sound distinctly.";
    } else if (item.type === 'phrase') {
      instruction = "Pronounce this phrase slowly and clearly. This is for beginner English learners. Pronounce each word distinctly while maintaining natural flow.";
    } else {
      instruction = "Speak this sentence slowly and clearly with natural intonation. This is for beginner English learners. Use appropriate stress and rhythm for the sentence type. Make sure the recording is complete and clear without any interruptions or other sounds.";
    }
    
    // 커스텀 instructions 추가
    const customInstruction = getCustomInstructions(item);
    if (customInstruction) {
      instruction += " " + customInstruction;
    }
    
    // gpt-4o-mini-tts 모델 사용 (instructions 지원)
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: item.text,
      instructions: instruction,
      speed: 1.0, // 약간 느리게
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ "${item.text}" (${item.type}, 문항 ${item.questionNumber}) 완료 → ${path.basename(outputPath)}`);
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error: any) {
    console.error(`❌ "${item.text}" (${item.type}, 문항 ${item.questionNumber}) 실패:`, error?.message || error);
    if (error?.response) {
      console.error('   응답:', JSON.stringify(error.response, null, 2));
    }
    return false;
  }
}

/**
 * 특정 항목들만 재생성
 */
async function regenerateSpecificItems(itemTexts: string[]) {
  console.log(`\n🔄 특정 항목 재생성 시작: ${itemTexts.join(', ')}\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'p5_vocabulary');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const itemText of itemTexts) {
    // 해당 텍스트를 가진 항목 찾기
    const item = VOCABULARY_ITEMS.find(i => 
      i.text.toLowerCase() === itemText.toLowerCase()
    );
    
    if (!item) {
      console.warn(`⚠️  "${itemText}" 항목을 찾을 수 없습니다.`);
      continue;
    }
    
    const fileName = `${textToFileName(item.text)}.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateAudioFile(item, filePath, true); // forceRegenerate = true
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log(''); // 빈 줄로 구분
  }
  
  console.log(`\n📊 재생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
}

/**
 * 모든 어휘 오디오 파일 생성
 */
async function generateAllVocabularyAudio() {
  console.log('🎤 5교시 어휘 오디오 파일 생성 시작...\n');
  console.log(`총 ${VOCABULARY_ITEMS.length}개 항목 생성\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'p5_vocabulary');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 디렉토리 생성: ${outputDir}\n`);
  }
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ 
    questionNumber: number;
    text: string; 
    type: 'word' | 'phrase' | 'sentence';
    file: string 
  }> = [];
  
  for (const item of VOCABULARY_ITEMS) {
    const fileName = `${textToFileName(item.text)}.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateAudioFile(item, filePath);
    
    if (success) {
      successCount++;
      fileList.push({
        questionNumber: item.questionNumber,
        text: item.text,
        type: item.type,
        file: `/audio/p5_vocabulary/${fileName}`
      });
    } else {
      failCount++;
    }
    
    console.log(''); // 빈 줄로 구분
  }
  
  // 총 파일 크기 계산
  let totalSize = 0;
  fileList.forEach(({ file }) => {
    const fullPath = path.join(process.cwd(), 'public', file);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      totalSize += stats.size;
    }
  });
  
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  // 인덱스 파일 생성
  const indexFile = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
  
  console.log('\n📊 생성 완료:');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📁 저장 위치: ${outputDir}`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
  console.log(`📝 인덱스 파일: ${indexFile}`);
}

// 실행 모드 설정
const REGENERATE_MODE = true; // 재생성 모드 활성화

// 재생성이 필요한 항목들
const ITEMS_WITH_PRONUNCIATION_ISSUES: string[] = [
  'eraser', // 발음이 이상하다고 지적됨
  'Put on your coat.', // p 발음 생략 문제
];

if (REGENERATE_MODE) {
  regenerateSpecificItems(ITEMS_WITH_PRONUNCIATION_ISSUES)
    .then(() => {
      console.log('\n🎉 선택된 항목 재생성 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
} else {
  generateAllVocabularyAudio()
    .then(() => {
      console.log('\n🎉 모든 어휘 오디오 파일 생성 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
}

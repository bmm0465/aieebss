/**
 * 강세 테스트용 TTS 오디오 파일 생성 스크립트
 * 
 * 각 단어에 대해 정확한 강세와 틀린 강세 두 가지 버전을 생성합니다.
 * 
 * 사용법:
 * npx tsx scripts/generate-stress-audio.ts
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

// 단어와 정확한 강세 정보
interface WordStress {
  word: string;
  correctStress: string; // 예: "MON-key"
  wrongStress: string;   // 예: "mon-KEY"
  correctSyllable: number; // 강세가 있는 음절 (1부터 시작)
  wrongSyllable: number;   // 틀린 강세가 있는 음절
}

const WORDS: WordStress[] = [
  {
    word: "monkey",
    correctStress: "MON-key",
    wrongStress: "mon-KEY",
    correctSyllable: 1,
    wrongSyllable: 2
  },
  {
    word: "robot",
    correctStress: "RO-bot",
    wrongStress: "ro-BOT",
    correctSyllable: 1,
    wrongSyllable: 2
  },
  {
    word: "zebra",
    correctStress: "ZE-bra",
    wrongStress: "ze-BRA",
    correctSyllable: 1,
    wrongSyllable: 2
  },
  {
    word: "carrot",
    correctStress: "CAR-rot",
    wrongStress: "car-ROT",
    correctSyllable: 1,
    wrongSyllable: 2
  },
  {
    word: "brother",
    correctStress: "BROTH-er",
    wrongStress: "broth-ER",
    correctSyllable: 1,
    wrongSyllable: 2
  },
  {
    word: "okay",
    correctStress: "o-KAY",
    wrongStress: "O-kay",
    correctSyllable: 2,
    wrongSyllable: 1
  },
  {
    word: "flower",
    correctStress: "FLOW-er",
    wrongStress: "flow-ER",
    correctSyllable: 1,
    wrongSyllable: 2
  },
  {
    word: "banana",
    correctStress: "ba-NA-na",
    wrongStress: "BA-na-na",
    correctSyllable: 2,
    wrongSyllable: 1
  },
  {
    word: "tomato",
    correctStress: "to-MA-to",
    wrongStress: "TO-ma-to",
    correctSyllable: 2,
    wrongSyllable: 1
  },
  {
    word: "violin",
    correctStress: "vi-o-LIN",
    wrongStress: "VI-o-lin",
    correctSyllable: 3,
    wrongSyllable: 1
  }
];

/**
 * 강세를 제어하는 instructions 생성
 */
function createStressInstruction(
  word: string,
  stressedSyllable: number,
  isCorrect: boolean
): string {
  // 강세가 있는 음절을 명확히 표시
  const syllableDescription = stressedSyllable === 1 
    ? "first syllable"
    : stressedSyllable === 2
    ? "second syllable"
    : stressedSyllable === 3
    ? "third syllable"
    : `${stressedSyllable}th syllable`;
  
  return `Pronounce the word "${word}" with strong primary stress on the ${syllableDescription}. 
    Make the stressed syllable significantly louder, longer in duration, and higher in pitch. 
    The unstressed syllables should be pronounced more quickly, quietly, and with reduced vowel sounds. 
    Speak clearly and naturally, as if teaching English pronunciation to a beginner. 
    The stress pattern should be very noticeable and distinct.`;
}

/**
 * TTS로 오디오 파일 생성
 */
async function generateAudioFile(
  word: string,
  outputPath: string,
  stressInstruction: string,
  description: string
): Promise<boolean> {
  try {
    // 이미 파일이 존재하면 스킵
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  "${word}" (${description}) 이미 존재, 스킵`);
      return true;
    }

    console.log(`⏳ "${word}" (${description}) 생성 중...`);
    
    // gpt-4o-mini-tts 모델 사용 (instructions 지원)
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: word,
      instructions: stressInstruction,
      speed: 0.9, // 약간 느리게
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ "${word}" (${description}) 완료 → ${path.basename(outputPath)}`);
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error: any) {
    console.error(`❌ "${word}" (${description}) 실패:`, error?.message || error);
    if (error?.response) {
      console.error('   응답:', JSON.stringify(error.response, null, 2));
    }
    return false;
  }
}

/**
 * 모든 강세 오디오 파일 생성
 */
async function generateAllStressAudio() {
  console.log('🎤 강세 오디오 파일 생성 시작...\n');
  console.log(`총 ${WORDS.length}개 단어, 각각 2개 버전 = ${WORDS.length * 2}개 파일\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'stress');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 디렉토리 생성: ${outputDir}\n`);
  }
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ word: string; type: string; file: string }> = [];
  
  for (const wordData of WORDS) {
    const { word, correctStress, wrongStress, correctSyllable, wrongSyllable } = wordData;
    
    // 정확한 강세 버전 생성
    const correctInstruction = createStressInstruction(word, correctSyllable, true);
    const correctFileName = `${word}_correct.mp3`;
    const correctPath = path.join(outputDir, correctFileName);
    
    const correctSuccess = await generateAudioFile(
      word,
      correctPath,
      correctInstruction,
      `정확한 강세 (${correctStress})`
    );
    
    if (correctSuccess) {
      successCount++;
      fileList.push({
        word,
        type: 'correct',
        file: `/audio/stress/${correctFileName}`
      });
    } else {
      failCount++;
    }
    
    // 틀린 강세 버전 생성
    const wrongInstruction = createStressInstruction(word, wrongSyllable, false);
    const wrongFileName = `${word}_wrong.mp3`;
    const wrongPath = path.join(outputDir, wrongFileName);
    
    const wrongSuccess = await generateAudioFile(
      word,
      wrongPath,
      wrongInstruction,
      `틀린 강세 (${wrongStress})`
    );
    
    if (wrongSuccess) {
      successCount++;
      fileList.push({
        word,
        type: 'wrong',
        file: `/audio/stress/${wrongFileName}`
      });
    } else {
      failCount++;
    }
    
    console.log(''); // 빈 줄로 구분
  }
  
  // 총 파일 크기 계산
  let totalSize = 0;
  fileList.forEach(item => {
    const filePath = path.join(outputDir, path.basename(item.file));
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }
  });
  
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  // 인덱스 파일 생성
  const indexFile = path.join(outputDir, 'stress_index.json');
  fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
  
  console.log('\n📊 생성 완료:');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📁 저장 위치: ${outputDir}`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
  console.log(`📝 인덱스 파일: ${indexFile}`);
}

// 실행
generateAllStressAudio()
  .then(() => {
    console.log('\n🎉 모든 강세 오디오 파일 생성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 오류:', error);
    process.exit(1);
  });


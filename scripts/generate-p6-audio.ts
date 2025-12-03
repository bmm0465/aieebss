/**
 * 6교시 시험용 TTS 오디오 파일 생성 스크립트
 * 
 * 생성 항목:
 * - p6_items.json의 각 문항의 speaker1과 speaker2 음성
 * - 화자별로 다른 음성 사용 (Speaker 1: 남성/중성, Speaker 2: 여성/다른 톤)
 * 
 * 사용법:
 * npx tsx scripts/generate-p6-audio.ts
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

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY가 설정되지 않았습니다.');
  console.error('   .env.local 파일에 OPENAI_API_KEY를 추가하세요.');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey,
});

// p6_items.json 형식
interface P6JsonItem {
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
    target: string;
    description: string;
  };
}

/**
 * p6_items.json 파일 로드
 */
function loadP6Items(): P6JsonItem[] {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'p6_items.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return data as P6JsonItem[];
  } catch (error) {
    console.error('p6_items.json 로드 오류:', error);
    return [];
  }
}

/**
 * 텍스트를 파일명에 사용할 수 있는 형태로 변환
 */
function textToFileName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 50);
}

/**
 * TTS로 오디오 파일 생성
 * @param text - 생성할 텍스트
 * @param outputPath - 출력 경로
 * @param voice - 음성 종류 ('alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer')
 * @param description - 설명
 */
async function generateAudioFile(
  text: string,
  outputPath: string,
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
  description: string
): Promise<boolean> {
  try {
    // 이미 파일이 존재하면 스킵
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  "${text}" 이미 존재, 스킵`);
      return true;
    }

    console.log(`⏳ "${text}" (${description}, ${voice}) 생성 중...`);
    
    // 초보자를 위해 느리고 명확하게 발음하도록 instructions 사용
    const speedInstruction = "Speak slowly and clearly. This is for beginner English learners. Pronounce each word distinctly and at a slower pace than normal conversation. Use natural intonation for questions and statements.";
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
      // instructions: speedInstruction, // tts-1 모델은 instructions 미지원
      speed: 0.8, // 0.25 ~ 4.0, 기본값 1.0
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ "${text}" 완료 → ${outputPath}`);
    
    return true;
  } catch (error) {
    console.error(`❌ "${text}" 실패:`, error);
    return false;
  }
}

/**
 * 6교시 대화 오디오 파일 생성
 * @param limit - 생성할 문항 개수 제한 (테스트용, undefined면 전체 생성)
 */
async function generateP6Audio(limit?: number) {
  console.log('\n🎤 6교시 대화 오디오 파일 생성 시작...');
  
  const allItems = loadP6Items();
  if (allItems.length === 0) {
    console.error('❌ p6_items.json에서 문항을 로드할 수 없습니다.');
    return;
  }
  
  const items = limit ? allItems.slice(0, limit) : allItems;
  
  if (limit) {
    console.log(`⚠️  테스트 모드: 처음 ${limit}개 문항만 생성합니다.`);
  }
  
  console.log(`총 ${allItems.length}개 문항 중 ${items.length}개 처리`);
  
  // 화자별 음성 설정
  // Speaker 1: 남성/중성 음성
  const speaker1Voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'echo'; // 남성
  // Speaker 2: 여성/다른 음성
  const speaker2Voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova'; // 여성
  
  const baseDir = path.join(process.cwd(), 'public', 'audio', 'comprehension');
  
  // speaker1과 speaker2를 분리된 폴더에 저장
  const speaker1Dir = path.join(baseDir, 'p6_speaker1');
  const speaker2Dir = path.join(baseDir, 'p6_speaker2');
  
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  // 고유한 speaker1과 speaker2 텍스트 수집
  const uniqueSpeaker1Texts = new Map<string, string>(); // text -> itemId
  const uniqueSpeaker2Texts = new Map<string, string>(); // text -> itemId
  
  for (const item of items) {
    if (item.script.speaker1) {
      uniqueSpeaker1Texts.set(item.script.speaker1, item.id);
    }
    if (item.script.speaker2) {
      uniqueSpeaker2Texts.set(item.script.speaker2, item.id);
    }
  }
  
  console.log(`\n📊 고유한 대화 문장:`);
  console.log(`  - Speaker 1: ${uniqueSpeaker1Texts.size}개`);
  console.log(`  - Speaker 2: ${uniqueSpeaker2Texts.size}개`);
  console.log(`  - 총 ${uniqueSpeaker1Texts.size + uniqueSpeaker2Texts.size}개 음성 파일 생성 예정\n`);
  
  // Speaker 1 음성 생성
  console.log(`\n🎙️  Speaker 1 음성 생성 (${speaker1Voice})...`);
  for (const [text, itemId] of uniqueSpeaker1Texts.entries()) {
    const fileName = `${textToFileName(text)}.mp3`;
    const outputPath = path.join(speaker1Dir, fileName);
    
    const result = await generateAudioFile(text, outputPath, speaker1Voice, `Speaker 1 (${itemId})`);
    
    if (result) {
      if (fs.existsSync(outputPath)) {
        successCount++;
      } else {
        skipCount++;
      }
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위한 짧은 딜레이
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Speaker 2 음성 생성
  console.log(`\n🎙️  Speaker 2 음성 생성 (${speaker2Voice})...`);
  for (const [text, itemId] of uniqueSpeaker2Texts.entries()) {
    const fileName = `${textToFileName(text)}.mp3`;
    const outputPath = path.join(speaker2Dir, fileName);
    
    const result = await generateAudioFile(text, outputPath, speaker2Voice, `Speaker 2 (${itemId})`);
    
    if (result) {
      if (fs.existsSync(outputPath)) {
        successCount++;
      } else {
        skipCount++;
      }
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위한 짧은 딜레이
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n✨ 완료!`);
  console.log(`  - 성공: ${successCount}개`);
  console.log(`  - 스킵: ${skipCount}개`);
  console.log(`  - 실패: ${failCount}개`);
  console.log(`\n📁 생성된 파일 위치:`);
  console.log(`  - Speaker 1: ${speaker1Dir}`);
  console.log(`  - Speaker 2: ${speaker2Dir}`);
}

// 메인 실행
// 전체 문항 생성 (limit 없음 = 전체)
generateP6Audio().catch((error) => {
  console.error('❌ 스크립트 실행 중 오류:', error);
  process.exit(1);
});


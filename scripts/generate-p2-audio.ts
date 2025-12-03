/**
 * 2교시 시험용 TTS 오디오 파일 생성 스크립트
 * 
 * 생성 항목:
 * 1. 알파벳 a-z의 음가(발음) - 26개
 * 2. 천재교과서(함)의 모든 단어 - vocabulary_level.json에서 추출
 * 
 * 사용법:
 * npx tsx scripts/generate-p2-audio.ts
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

// 알파벳 음가(발음) - TTS가 이해할 수 있도록 표현
// 각 알파벳의 음가만 발음하도록 지시 (letter sound, not letter name)
// 기존 코드의 letterSounds 표현 방식 참고
const ALPHABET_SOUNDS: Record<string, string> = {
  'a': 'eh',      // /æ/ sound as in "apple" - letter sound only
  'b': 'buh',     // /b/ sound as in "ball" - letter sound only
  'c': 'kuh',     // /k/ sound as in "cat" - letter sound only
  'd': 'duh',     // /d/ sound as in "dog" - letter sound only
  'e': 'eh',      // /e/ sound as in "egg" - letter sound only
  'f': 'fuh',     // /f/ sound as in "fish" - letter sound only
  'g': 'guh',     // /g/ sound as in "go" - letter sound only
  'h': 'huh',     // /h/ sound as in "hat" - letter sound only
  'i': 'ih',      // /ɪ/ sound as in "it" - letter sound only
  'j': 'juh',     // /dʒ/ sound as in "jam" - letter sound only
  'k': 'kuh',     // /k/ sound as in "key" - letter sound only
  'l': 'luh',     // /l/ sound as in "leg" - letter sound only
  'm': 'muh',     // /m/ sound as in "map" - letter sound only
  'n': 'nuh',     // /n/ sound as in "net" - letter sound only
  'o': 'ah',      // /ɔ/ sound as in "ox" - letter sound only
  'p': 'puh',     // /p/ sound as in "pen" - letter sound only
  'q': 'kwuh',    // /kw/ sound as in "queen" - letter sound only
  'r': 'ruh',     // /r/ sound as in "red" - letter sound only
  's': 'suh',     // /s/ sound as in "sun" - letter sound only
  't': 'tuh',     // /t/ sound as in "top" - letter sound only
  'u': 'uh',      // /ʌ/ sound as in "up" - letter sound only
  'v': 'vuh',     // /v/ sound as in "van" - letter sound only
  'w': 'wuh',     // /w/ sound as in "web" - letter sound only
  'x': 'ks',      // /ks/ sound as in "box" - letter sound only
  'y': 'yuh',     // /j/ sound as in "yes" - letter sound only
  'z': 'zuh',     // /z/ sound as in "zip" - letter sound only
};

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
 * TTS로 오디오 파일 생성
 * - 속도를 느리게 하기 위해 instructions 파라미터 사용
 */
async function generateAudioFile(
  text: string,
  outputPath: string,
  description: string
): Promise<boolean> {
  try {
    console.log(`⏳ "${text}" (${description}) 생성 중...`);
    
    // 초보자를 위해 느리고 명확하게 발음하도록 instructions 사용
    // OpenAI TTS API의 instructions 파라미터로 속도 제어 가능
    // 알파벳 음가의 경우 letter sound만 발음하도록 추가 지시
    const isAlphabetSound = description.includes('알파벳');
    const speedInstruction = isAlphabetSound
      ? "Pronounce only the letter sound (phoneme), not the letter name. Speak very slowly and clearly, emphasizing each sound distinctly. This is for beginner English learners."
      : "Speak slowly and clearly. This is for beginner English learners who are hearing English for the first time in public education. Pronounce each sound distinctly and at a slower pace than normal conversation.";
    
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: text,
      instructions: speedInstruction,
      speed: 0.8,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ "${text}" 완료`);
    
    return true;
  } catch (error) {
    console.error(`❌ "${text}" 실패:`, error);
    return false;
  }
}

/**
 * 알파벳 음가 오디오 파일 생성
 * @param limit - 생성할 알파벳 개수 제한 (테스트용, undefined면 전체 생성)
 */
async function generateAlphabetSounds(limit?: number) {
  console.log('\n🎤 알파벳 음가 오디오 파일 생성 시작...');
  
  // a부터 z까지 순서대로 생성
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const alphabetToGenerate = limit ? alphabet.slice(0, limit) : alphabet;
  
  console.log(`총 ${alphabetToGenerate.length}개 알파벳 생성${limit ? ' (테스트 모드)' : ''}`);
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'p2_segmental_phoneme', 'alphabet-sounds');
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ letter: string; sound: string; file: string }> = [];
  
  for (const letter of alphabetToGenerate) {
    const sound = ALPHABET_SOUNDS[letter];
    if (!sound) {
      console.warn(`⚠️ 알파벳 "${letter}"의 음가가 정의되지 않았습니다.`);
      continue;
    }
    
    const fileName = `${letter}_sound.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateAudioFile(sound, filePath, `알파벳 ${letter} 음가`);
    
    if (success) {
      successCount++;
      fileList.push({
        letter,
        sound,
        file: `/audio/p2_segmental_phoneme/alphabet-sounds/${fileName}`
      });
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // 인덱스 파일 생성
  const indexFile = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
  console.log(`📝 인덱스 파일 생성: ${indexFile}`);
  
  console.log(`\n📊 알파벳 음가 생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  
  return { successCount, failCount, fileList };
}

/**
 * 천재교과서(함) 단어 오디오 파일 생성
 * @param limit - 생성할 단어 개수 제한 (테스트용, undefined면 전체 생성)
 */
async function generateChunjaeTextHamWords(limit?: number) {
  console.log('\n🎤 천재교과서(함) 단어 오디오 파일 생성 시작...');
  
  const words = loadChunjaeTextHamWords();
  const wordsToGenerate = limit ? words.slice(0, limit) : words;
  
  console.log(`총 ${wordsToGenerate.length}개 단어 생성${limit ? ' (테스트 모드)' : ''}${limit && words.length > limit ? ` (전체 ${words.length}개 중)` : ''}`);
  
  if (wordsToGenerate.length === 0) {
    console.error('❌ 단어를 찾을 수 없습니다.');
    return { successCount: 0, failCount: 0, fileList: [] };
  }
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'p2_segmental_phoneme', 'chunjae-text-ham');
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ word: string; file: string }> = [];
  
  for (const word of wordsToGenerate) {
    // 파일명에 사용할 수 없는 문자 제거
    const safeFileName = word.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${safeFileName}.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateAudioFile(word, filePath, `단어: ${word}`);
    
    if (success) {
      successCount++;
      fileList.push({
        word,
        file: `/audio/p2_segmental_phoneme/chunjae-text-ham/${fileName}`
      });
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // 인덱스 파일 생성
  const indexFile = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
  console.log(`📝 인덱스 파일 생성: ${indexFile}`);
  
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
  
  console.log(`\n📊 천재교과서(함) 단어 생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
  
  return { successCount, failCount, fileList };
}

/**
 * 메인 실행 함수
 * @param testMode - 테스트 모드 (각각 5개씩만 생성)
 */
async function generateAllAudioFiles(testMode: boolean = false) {
  console.log('🎵 2교시 시험용 오디오 파일 생성 시작...');
  if (testMode) {
    console.log('🧪 테스트 모드: 알파벳 5개, 단어 5개만 생성\n');
  } else {
    console.log('');
  }
  
  // 1. 알파벳 음가 생성
  const alphabetResult = await generateAlphabetSounds(testMode ? 5 : undefined);
  
  // 2. 천재교과서(함) 단어 생성
  const wordsResult = await generateChunjaeTextHamWords(testMode ? 5 : undefined);
  
  // 최종 요약
  console.log('\n' + '='.repeat(50));
  console.log('📊 최종 생성 결과:');
  console.log('='.repeat(50));
  console.log(`알파벳 음가: ✅ ${alphabetResult.successCount}개 / ❌ ${alphabetResult.failCount}개`);
  console.log(`천재교과서(함) 단어: ✅ ${wordsResult.successCount}개 / ❌ ${wordsResult.failCount}개`);
  console.log(`총 성공: ${alphabetResult.successCount + wordsResult.successCount}개`);
  console.log(`총 실패: ${alphabetResult.failCount + wordsResult.failCount}개`);
  console.log('='.repeat(50));
}

/**
 * 특정 단어만 재생성하는 함수
 */
async function regenerateSpecificWords(words: string[]) {
  console.log(`\n🔄 특정 단어 재생성 시작: ${words.join(', ')}\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'p2_segmental_phoneme', 'chunjae-text-ham');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const word of words) {
    // 파일명에 사용할 수 없는 문자 제거
    const safeFileName = word.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${safeFileName}.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateAudioFile(word, filePath, `단어: ${word}`);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\n📊 재생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
}

// 실행
// 특정 단어만 재생성하려면 아래 배열에 단어를 추가하고 REGENERATE_MODE를 true로 설정
const REGENERATE_MODE = true;
const WORDS_TO_REGENERATE = ['ten'];

if (REGENERATE_MODE) {
  regenerateSpecificWords(WORDS_TO_REGENERATE)
    .then(() => {
      console.log('\n🎉 단어 재생성 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
} else {
  // 테스트 모드: 각각 5개씩만 생성
  const TEST_MODE = false; // false로 변경하면 전체 생성

  generateAllAudioFiles(TEST_MODE)
    .then(() => {
      console.log('\n🎉 모든 오디오 파일 생성 완료!');
      if (TEST_MODE) {
        console.log('💡 테스트 모드였습니다. 전체 생성을 원하시면 TEST_MODE를 false로 변경하세요.');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
}


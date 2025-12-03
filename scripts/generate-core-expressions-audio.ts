/**
 * 천재교과서(함) 핵심 표현 TTS 오디오 파일 생성 스크립트
 * 
 * 생성 항목:
 * - core_expressions.json에서 chunjae_text_ham 필드의 모든 표현
 * - "Hi. / Hello." 같은 형태는 "/"로 분리하여 각각 생성
 * 
 * 사용법:
 * npx tsx scripts/generate-core-expressions-audio.ts
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

/**
 * core_expressions.json에서 천재교과서(함)의 모든 표현 추출
 */
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
          // "Hi. / Hello." 같은 형태는 "/"로 분리
          const tokens = publisherValue
            .split('/')
            .map((t: string) => t.trim())
            .filter((t: string) => t.length > 0);
          expressions.push(...tokens);
        }
      }
    }
    
    // 중복 제거 및 정렬
    const unique = Array.from(new Set(expressions));
    return unique.sort();
  } catch (error) {
    console.error('core_expressions.json 로드 오류:', error);
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
    const speedInstruction = "Speak slowly and clearly. This is for beginner English learners who are hearing English for the first time in public education. Pronounce each word distinctly and at a slower pace than normal conversation. For expressions, use natural intonation but maintain clarity.";
    
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
 * 천재교과서(함) 핵심 표현 오디오 파일 생성
 * @param limit - 생성할 표현 개수 제한 (테스트용, undefined면 전체 생성)
 */
async function generateChunjaeTextHamExpressions(limit?: number) {
  console.log('\n🎤 천재교과서(함) 핵심 표현 오디오 파일 생성 시작...');
  
  const expressions = loadChunjaeTextHamExpressions();
  const expressionsToGenerate = limit ? expressions.slice(0, limit) : expressions;
  
  console.log(`총 ${expressionsToGenerate.length}개 표현 생성${limit ? ' (테스트 모드)' : ''}${limit && expressions.length > limit ? ` (전체 ${expressions.length}개 중)` : ''}`);
  
  if (expressionsToGenerate.length === 0) {
    console.error('❌ 표현을 찾을 수 없습니다.');
    return { successCount: 0, failCount: 0, fileList: [] };
  }
  
  // 5교시와 6교시에서 사용하므로 comprehension 폴더에 저장
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'comprehension');
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ expression: string; file: string }> = [];
  
  for (const expression of expressionsToGenerate) {
    // 파일명에 사용할 수 없는 문자 제거
    // "Hi. / Hello." -> "hi__hello" 같은 형태로 변환
    const safeFileName = expression
      .replace(/[^a-zA-Z0-9\s]/g, '_')  // 특수문자를 언더스코어로
      .replace(/\s+/g, '_')              // 공백을 언더스코어로
      .toLowerCase();
    
    const fileName = `${safeFileName}.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    // 이미 파일이 존재하면 건너뛰기 (선택적)
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  "${expression}" 이미 존재함, 건너뛰기`);
      successCount++;
      fileList.push({
        expression,
        file: `/audio/comprehension/${fileName}`
      });
      continue;
    }
    
    const success = await generateAudioFile(expression, filePath, `표현: ${expression}`);
    
    if (success) {
      successCount++;
      fileList.push({
        expression,
        file: `/audio/comprehension/${fileName}`
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
  
  console.log(`\n📊 천재교과서(함) 핵심 표현 생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
  
  return { successCount, failCount, fileList };
}

/**
 * 특정 표현만 재생성하는 함수
 */
async function regenerateSpecificExpressions(expressions: string[]) {
  console.log(`\n🔄 특정 표현 재생성 시작: ${expressions.join(', ')}\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'comprehension');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const expression of expressions) {
    const safeFileName = expression
      .replace(/[^a-zA-Z0-9\s]/g, '_')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    const fileName = `${safeFileName}.mp3`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateAudioFile(expression, filePath, `표현: ${expression}`);
    
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
// 특정 표현만 재생성하려면 아래 배열에 표현을 추가하고 REGENERATE_MODE를 true로 설정
const REGENERATE_MODE = false;
const EXPRESSIONS_TO_REGENERATE = ['Hi.', 'Hello.', "I'm Momo."];

if (REGENERATE_MODE) {
  regenerateSpecificExpressions(EXPRESSIONS_TO_REGENERATE)
    .then(() => {
      console.log('\n🎉 표현 재생성 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
} else {
  // 테스트 모드: 5개만 생성
  const TEST_MODE = false; // false로 변경하면 전체 생성

  generateChunjaeTextHamExpressions(TEST_MODE ? 5 : undefined)
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


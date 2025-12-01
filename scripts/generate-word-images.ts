/**
 * 천재교과서(함) 단어 이미지 생성 스크립트
 * 
 * DALL-E 3 모델을 사용하여 단어 이미지 생성
 * - 다른 단어와 헷갈리지 않도록 명확하게
 * - 전체적인 디자인/양식이 동일하게 유지
 * 
 * 사용법:
 * npx tsx scripts/generate-word-images.ts
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

// vocabulary_level.json에서 천재교과서(함) 단어 추출
// 2글자 이상만 포함 (1글자 단어 제외)
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

/**
 * 단어에 대한 일관된 스타일의 이미지 생성 프롬프트
 * - 명확하고 구분하기 쉬운 이미지
 * - 일관된 디자인 스타일 유지
 */
function buildImagePrompt(word: string): string {
  return `A simple, clear, and educational illustration of "${word}" for Korean elementary school English learners. 
The image should be:
- Clean and uncluttered, with a white or light background
- Simple cartoon or clipart style, suitable for children's educational materials
- The main subject should be clearly visible and easily recognizable
- No text or labels in the image
- Consistent art style: friendly, colorful, and educational
- The object should be centered and well-lit
- Avoid complex backgrounds or distracting elements
- Make sure the image clearly represents only "${word}" and nothing else that could cause confusion with other words.`;
}

/**
 * 이미지 생성 함수
 */
async function generateImage(
  word: string,
  outputPath: string,
  retryCount: number = 0
): Promise<boolean> {
  const maxRetries = 3;
  
  try {
    console.log(`⏳ "${word}" 이미지 생성 중... (시도 ${retryCount + 1}/${maxRetries})`);
    
    const prompt = buildImagePrompt(word);
    
    const result = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
      response_format: "b64_json", // Base64 형식으로 받기
    });
    
    if (!result.data || result.data.length === 0) {
      throw new Error('이미지 데이터가 없습니다.');
    }
    
    // DALL-E 3는 b64_json 또는 url을 반환
    const imageData = result.data[0];
    let imageBytes: Buffer;
    
    if (imageData.b64_json) {
      // Base64 데이터가 있는 경우
      imageBytes = Buffer.from(imageData.b64_json, 'base64');
    } else if (imageData.url) {
      // URL이 있는 경우 다운로드
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new Error(`이미지 다운로드 실패: ${imageResponse.statusText}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBytes = Buffer.from(arrayBuffer);
    } else {
      throw new Error('이미지 데이터 형식을 확인할 수 없습니다.');
    }
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, imageBytes);
    console.log(`✅ "${word}" 완료`);
    
    return true;
  } catch (error) {
    console.error(`❌ "${word}" 실패:`, error);
    
    if (retryCount < maxRetries - 1) {
      console.log(`🔄 "${word}" 재시도 중...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 후 재시도
      return generateImage(word, outputPath, retryCount + 1);
    }
    
    return false;
  }
}

/**
 * 특정 단어만 재생성하는 함수
 */
async function regenerateSpecificWords(words: string[]) {
  console.log(`\n🔄 특정 단어 이미지 재생성 시작: ${words.join(', ')}\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'images', 'vocabulary', 'chunjae-text-ham');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const word of words) {
    // 파일명에 사용할 수 없는 문자 제거
    const safeFileName = word.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${safeFileName}.png`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateImage(word, filePath);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
  }
  
  console.log(`\n📊 재생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
}

/**
 * 모든 단어 이미지 생성
 */
async function generateAllWordImages(limit?: number) {
  console.log('🎨 천재교과서(함) 단어 이미지 생성 시작...\n');
  
  const words = loadChunjaeTextHamWords();
  const wordsToGenerate = limit ? words.slice(0, limit) : words;
  
  console.log(`📚 총 ${wordsToGenerate.length}개 단어 생성${limit ? ' (테스트 모드)' : ''}${limit && words.length > limit ? ` (전체 ${words.length}개 중)` : ''}\n`);
  
  if (wordsToGenerate.length === 0) {
    console.error('❌ 단어를 찾을 수 없습니다.');
    return;
  }
  
  const outputDir = path.join(process.cwd(), 'public', 'images', 'vocabulary', 'chunjae-text-ham');
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ word: string; file: string }> = [];
  
  for (const word of wordsToGenerate) {
    // 파일명에 사용할 수 없는 문자 제거
    const safeFileName = word.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${safeFileName}.png`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateImage(word, filePath);
    
    if (success) {
      successCount++;
      fileList.push({
        word,
        file: `/images/vocabulary/chunjae-text-ham/${fileName}`
      });
    } else {
      failCount++;
    }
    
    // API 레이트 리밋 방지를 위해 딜레이 (이미지 생성은 시간이 오래 걸릴 수 있음)
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
  }
  
  // 인덱스 파일 생성
  if (fileList.length > 0) {
    const indexFile = path.join(outputDir, 'index.json');
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
    console.log(`📝 인덱스 파일 생성: ${indexFile}`);
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
  
  console.log(`\n📊 생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
}

// 실행
// 특정 단어만 재생성하려면 아래 배열에 단어를 추가하고 REGENERATE_MODE를 true로 설정
const REGENERATE_MODE = false;
const WORDS_TO_REGENERATE: string[] = [];

// 테스트 모드: 처음 5개만 생성
const TEST_MODE = true;
const TEST_LIMIT = 5;

if (REGENERATE_MODE) {
  regenerateSpecificWords(WORDS_TO_REGENERATE)
    .then(() => {
      console.log('\n🎉 단어 이미지 재생성 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
} else {
  generateAllWordImages(TEST_MODE ? TEST_LIMIT : undefined)
    .then(() => {
      console.log('\n🎉 모든 이미지 생성 완료!');
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


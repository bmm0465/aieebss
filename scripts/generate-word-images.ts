/**
 * 단어/어구/문장 이미지 생성 스크립트
 * 
 * Google Gemini API를 사용하여 단어, 어구, 문장에 대한 이미지 생성
 * - 다른 단어와 헷갈리지 않도록 명확하게
 * - 전체적인 디자인/양식이 동일하게 유지
 * - 이미지에 텍스트/단어가 포함되지 않도록 함
 * - 이미지 용량 최적화
 * 
 * 사용법:
 * npx tsx scripts/generate-word-images.ts
 * 
 * 환경 변수:
 * GOOGLE_AI_API_KEY: Google AI Studio API 키
 * 
 * 참고: Google AI Studio에서 API 키 발급
 * https://aistudio.google.com/app/apikey
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// .env.local 파일에서 환경 변수 로드
dotenv.config({ path: '.env.local' });

const googleApiKey = process.env.GOOGLE_AI_API_KEY;
const modelName = 'gemini-2.5-flash-image';

if (!googleApiKey) {
  console.error('❌ GOOGLE_AI_API_KEY가 설정되지 않았습니다.');
  console.error('   .env.local 파일에 GOOGLE_AI_API_KEY를 추가하세요.');
  console.error('   Google AI Studio에서 API 키 발급: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(googleApiKey);

/**
 * 생성할 단어/어구/문장 목록
 */
const TARGET_ITEMS: string[] = [
  'a big apple',
  'a big bag',
  'a big ball',
  'a big bear',
  'a big dog',
  'a big fish',
  'a big lion',
  'a big mouse',
  'a black cat',
  'a black dog',
  'a blue bird',
  'a blue crayon',
  'a boy jumping',
  'a boy running',
  'a boy swimming',
  'a brown dog',
  'a green bag',
  'a green bird',
  'a pink bag',
  'a red bag',
  'a red bird',
  'a red crayon',
  'a small bag',
  'a small ball',
  'a small bear',
  'a small cap',
  'a small fish',
  'a small lion',
  'a small whale',
  'a white cat',
  'a white dog',
  'a yellow cat',
  'a yellow crayon',
  'bag',
  'bed',
  'brother',
  'chicken',
  'cup',
  'dad',
  'dancing',
  'grandma',
  'grandpa',
  'mom',
  'pizza',
  'raining',
  'sister',
  'skating',
  'skiing',
  'snowing',
  'steak',
  'sunny',
];

/**
 * 인물 단어인지 확인
 */
function isPersonWord(item: string): boolean {
  const personWords = ['brother', 'dad', 'grandma', 'grandpa', 'mom', 'sister'];
  const itemLower = item.toLowerCase().trim();
  return personWords.some(word => itemLower === word || itemLower.includes(word));
}

/**
 * 단어/어구/문장에 대한 일관된 스타일의 이미지 생성 프롬프트
 * - 명확하고 구분하기 쉬운 이미지
 * - 일관된 디자인 스타일 유지
 * - 텍스트/단어가 이미지에 포함되지 않도록 강조
 * - 관사 'a'가 있는 경우 정확히 하나만 표시
 * - 인물 단어의 경우 빨간 화살표로 표시
 */
function buildImagePrompt(item: string): string {
  // 문장인지 확인 (대문자로 시작하고 마침표나 물음표로 끝나는 경우)
  const isSentence = /^[A-Z].*[.!?]$/.test(item.trim());
  
  // 관사 'a'가 있는지 확인
  const hasArticleA = /^a\s/i.test(item.trim());
  
  // 인물 단어인지 확인
  const isPerson = isPersonWord(item);
  
  // 기본 요구사항
  const baseRequirements = `- Absolutely NO text, words, letters, or labels in the image
- NO writing, NO labels, NO captions, NO words of any kind
- The image must be purely visual with zero text elements
- Clean and uncluttered, with a white or light background
- Simple cartoon or clipart style, suitable for children's educational materials
- Consistent art style: friendly, colorful, and educational
- Avoid complex backgrounds or distracting elements
- Optimize for small file size while maintaining visual quality`;
  
  // 관사 'a' 관련 요구사항
  const articleARequirement = hasArticleA 
    ? `- IMPORTANT: The article "a" means exactly ONE (1) item. Show exactly one ${item.replace(/^a\s+/i, '').trim()}, not two or more
- Make sure there is only ONE object/subject in the image to accurately represent "a"`
    : '';
  
  // 인물 단어 관련 요구사항
  let personRequirement = '';
  if (isPerson) {
    const itemLower = item.toLowerCase().trim();
    if (itemLower === 'dad') {
      personRequirement = `- IMPORTANT: This word means "dad" (아빠). Show a family scene with four people: dad (아빠), mom (엄마), son (아들), and daughter (딸)
- Add a bright red arrow pointing down to the dad's head to clearly indicate which person represents "dad"
- The red arrow should be clearly visible and point directly at the dad's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "dad"`;
    } else if (itemLower === 'grandma') {
      personRequirement = `- IMPORTANT: This word means "grandma" (할머니). Show a grandma character
- Add a bright red arrow pointing down to the grandma's head to clearly indicate which person represents "grandma"
- The red arrow should be clearly visible and point directly at the grandma's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "grandma"`;
    } else if (itemLower === 'grandpa') {
      personRequirement = `- IMPORTANT: This word means "grandpa" (할아버지). Show a grandpa character
- Add a bright red arrow pointing down to the grandpa's head to clearly indicate which person represents "grandpa"
- The red arrow should be clearly visible and point directly at the grandpa's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "grandpa"`;
    } else if (itemLower === 'brother') {
      personRequirement = `- IMPORTANT: This word means "brother" (형/오빠/남동생). Show a brother character
- Add a bright red arrow pointing down to the brother's head to clearly indicate which person represents "brother"
- The red arrow should be clearly visible and point directly at the brother's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "brother"`;
    } else if (itemLower === 'mom') {
      personRequirement = `- IMPORTANT: This word means "mom" (엄마). Show a mom character
- Add a bright red arrow pointing down to the mom's head to clearly indicate which person represents "mom"
- The red arrow should be clearly visible and point directly at the mom's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "mom"`;
    } else if (itemLower === 'sister') {
      personRequirement = `- IMPORTANT: This word means "sister" (누나/언니/여동생). Show a sister character
- Add a bright red arrow pointing down to the sister's head to clearly indicate which person represents "sister"
- The red arrow should be clearly visible and point directly at the sister's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "sister"`;
    } else {
      // 기본 인물 단어 처리
      personRequirement = `- IMPORTANT: This is a person word. Add a bright red arrow pointing down to the person's head to clearly indicate which person the word refers to
- The red arrow should be clearly visible and point directly at the person's head from above
- Make sure the red arrow makes it crystal clear which person in the image represents "${item}"`;
    }
  }
  
  if (isSentence || item.includes('and') || item.includes(',')) {
    // 문장이나 복합 표현인 경우
    return `Create a simple, clear, and educational illustration showing the action or scene described by "${item}" for Korean elementary school English learners. 
CRITICAL REQUIREMENTS:
${baseRequirements}
${articleARequirement}
${personRequirement}
- Show the complete action or scene clearly
- The scene should be clearly visible and easily recognizable
- The main elements should be centered and well-lit
- Make sure the image clearly represents "${item}" and nothing else that could cause confusion`;
  } else {
    // 단어나 어구인 경우
    return `Create a simple, clear, and educational illustration of "${item}" for Korean elementary school English learners. 
CRITICAL REQUIREMENTS:
${baseRequirements}
${articleARequirement}
${personRequirement}
- The main subject should be clearly visible and easily recognizable
- The object/subject should be centered and well-lit
- Make sure the image clearly represents only "${item}" and nothing else that could cause confusion with other words`;
  }
}

/**
 * Google Gemini API를 사용한 이미지 생성 함수
 */
async function generateImage(
  item: string,
  outputPath: string,
  retryCount: number = 0
): Promise<boolean> {
  const maxRetries = 3;
  
  try {
    // 이미 파일이 존재하면 스킵
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  "${item}" 이미 존재, 스킵`);
      return true;
    }
    
    console.log(`⏳ "${item}" 이미지 생성 중... (시도 ${retryCount + 1}/${maxRetries})`);
    
    const prompt = buildImagePrompt(item);
    
    // Gemini API를 사용하여 이미지 생성
    const imageBytes = await generateImageWithGemini(prompt);
    
    // 이미지 최적화 (용량 최소화)
    const optimizedImageBytes = await optimizeImage(imageBytes);
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, optimizedImageBytes);
    
    const originalSize = (imageBytes.length / 1024).toFixed(2);
    const optimizedSize = (optimizedImageBytes.length / 1024).toFixed(2);
    console.log(`✅ "${item}" 완료 (${originalSize}KB → ${optimizedSize}KB)`);
    
    return true;
  } catch (error) {
    console.error(`❌ "${item}" 실패:`, error);
    
    if (retryCount < maxRetries - 1) {
      console.log(`🔄 "${item}" 재시도 중...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기 후 재시도
      return generateImage(item, outputPath, retryCount + 1);
    }
    
    return false;
  }
}

/**
 * Google Gemini API를 사용하여 이미지 생성
 */
async function generateImageWithGemini(prompt: string): Promise<Buffer> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: modelName 
    });
    
    // Gemini 이미지 생성 API 호출
    // 참고: gemini-2.5-flash-image 모델은 이미지 생성을 지원합니다
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // 응답에서 이미지 데이터 추출
    // Gemini API의 응답 형식에 따라 다를 수 있음
    const parts = response.candidates?.[0]?.content?.parts;
    
    if (!parts || parts.length === 0) {
      throw new Error('이미지 생성 결과가 없습니다.');
    }
    
    // 이미지 데이터 찾기
    for (const part of parts) {
      // Base64 인코딩된 이미지 데이터
      if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
        return Buffer.from(part.inlineData.data, 'base64');
      }
      
      // 텍스트 응답에 Base64 데이터가 포함된 경우
      if (part.text) {
        const base64Match = part.text.match(/data:image\/[^;]+;base64,([^"'\s\n]+)/);
        if (base64Match) {
          return Buffer.from(base64Match[1], 'base64');
        }
        
        // URL이 포함된 경우
        const urlMatch = part.text.match(/https?:\/\/[^\s"']+\.(png|jpg|jpeg|gif|webp)/i);
        if (urlMatch) {
          const imageUrl = urlMatch[0];
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`이미지 다운로드 실패: ${imageResponse.statusText}`);
          }
          const arrayBuffer = await imageResponse.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      }
    }
    
    throw new Error('이미지 데이터를 찾을 수 없습니다. 응답 형식을 확인하세요.');
    
  } catch (error: any) {
    throw new Error(`Gemini API 이미지 생성 실패: ${error.message}`);
  }
}

/**
 * 이미지 최적화 (용량 최소화)
 * PNG 이미지를 압축하여 용량을 줄입니다.
 */
async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Node.js의 기본 기능만 사용하여 간단한 최적화
    // 더 나은 최적화를 원하면 sharp 같은 라이브러리를 사용할 수 있습니다.
    
    // 현재는 원본 이미지를 반환하지만, 필요시 추가 최적화 로직을 구현할 수 있습니다.
    // 예: sharp 라이브러리를 사용한 PNG 압축
    // const sharp = require('sharp');
    // return await sharp(imageBuffer)
    //   .png({ compressionLevel: 9, quality: 85 })
    //   .toBuffer();
    
    // 일단 원본 반환 (추후 sharp 등으로 최적화 가능)
    return imageBuffer;
    
  } catch (error: any) {
    console.warn('⚠️ 이미지 최적화 실패, 원본 사용:', error.message);
    return imageBuffer;
  }
}

/**
 * 특정 항목만 재생성하는 함수
 */
async function regenerateSpecificItems(items: string[]) {
  console.log(`\n🔄 특정 항목 이미지 재생성 시작: ${items.join(', ')}\n`);
  
  const outputDir = path.join(process.cwd(), 'public', 'images', 'p6_comprehension');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const item of items) {
    // 파일명에 사용할 수 없는 문자 제거 및 안전한 파일명 생성
    const safeFileName = item
      .replace(/[^a-zA-Z0-9\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .toLowerCase();
    const fileName = `${safeFileName}.png`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateImage(item, filePath);
    
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
 * 모든 항목 이미지 생성
 */
async function generateAllImages(limit?: number) {
  console.log('🎨 단어/어구/문장 이미지 생성 시작...\n');
  
  const itemsToGenerate = limit ? TARGET_ITEMS.slice(0, limit) : TARGET_ITEMS;
  
  console.log(`📚 총 ${itemsToGenerate.length}개 항목 생성${limit ? ' (테스트 모드)' : ''}${limit && TARGET_ITEMS.length > limit ? ` (전체 ${TARGET_ITEMS.length}개 중)` : ''}\n`);
  
  if (itemsToGenerate.length === 0) {
    console.error('❌ 항목을 찾을 수 없습니다.');
    return;
  }
  
  const outputDir = path.join(process.cwd(), 'public', 'images', 'p6_comprehension');
  
  let successCount = 0;
  let failCount = 0;
  const fileList: Array<{ word: string; file: string }> = [];
  
  for (const item of itemsToGenerate) {
    // 파일명에 사용할 수 없는 문자 제거 및 안전한 파일명 생성
    const safeFileName = item
      .replace(/[^a-zA-Z0-9\s]/g, '') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .toLowerCase();
    const fileName = `${safeFileName}.png`;
    const filePath = path.join(outputDir, fileName);
    
    const success = await generateImage(item, filePath);
    
    if (success) {
      successCount++;
      fileList.push({
        word: item,  // p6_comprehension 페이지에서 word 필드를 읽으므로
        file: `/images/p6_comprehension/${fileName}`
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
  console.log(`📁 저장 위치: ${outputDir}`);
}

// 실행
// 특정 항목만 재생성하려면 아래 배열에 항목을 추가하고 REGENERATE_MODE를 true로 설정
const REGENERATE_MODE = true;
const ITEMS_TO_REGENERATE: string[] = [
  'brother',
  'dad',
  'grandma',
  'grandpa',
  'mom',
  'sister',
];

// 테스트 모드: 처음 5개만 생성
const TEST_MODE = false;
const TEST_LIMIT = 5;

if (REGENERATE_MODE) {
  regenerateSpecificItems(ITEMS_TO_REGENERATE)
    .then(() => {
      console.log('\n🎉 항목 이미지 재생성 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스크립트 실행 오류:', error);
      process.exit(1);
    });
} else {
  generateAllImages(TEST_MODE ? TEST_LIMIT : undefined)
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


/**
 * 천재교과서(함) 단어 이미지 생성 스크립트
 * 
 * Google Gemini API를 사용하여 단어 이미지 생성
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
 * 기능어(function words) 목록
 * 전치사, 접속사, 관사, 대명사, 조동사 등은 이미지 생성에서 제외
 */
const FUNCTION_WORDS = new Set([
  // 관사
  'a', 'an', 'the',
  // 전치사
  'at', 'in', 'on', 'for', 'with', 'by', 'from', 'to', 'of', 'about', 'up', 'down', 
  'out', 'off', 'over', 'under', 'into', 'onto', 'upon', 'through', 'across', 
  'between', 'among', 'during', 'before', 'after', 'since', 'until', 'within',
  // 접속사
  'and', 'or', 'but', 'so', 'because', 'if', 'when', 'while', 'though', 'although',
  // 대명사
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'mine', 'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself', 
  'herself', 'itself', 'ourselves', 'yourselves', 'themselves',
  // 조동사 및 be 동사
  'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
  'can', 'could', 'will', 'would', 'should', 'shall', 'may', 'might', 'must',
  'do', 'does', 'did', 'done', 'doing',
  'have', 'has', 'had', 'having',
  // 부사 (일부 기능어성 부사)
  'very', 'too', 'also', 'not', 'no', 'yes', 'here', 'there', 'where', 'when', 
  'why', 'how', 'now', 'then', 'well', 'just', 'only', 'even', 'still', 'yet',
  // 기타 기능어
  'oh', 'okay', 'ok', 'hi', 'hello', 'bye', 'goodbye', 'please', 'thank', 'thanks',
  'what', 'who', 'which', 'whose', 'whom',
]);

/**
 * 단어가 기능어인지 확인
 */
function isFunctionWord(word: string): boolean {
  return FUNCTION_WORDS.has(word.toLowerCase());
}

// vocabulary_level.json에서 천재교과서(함) 단어 추출
// 2글자 이상만 포함 (1글자 단어 제외)
// 기능어는 제외하고 내용어만 포함
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
            .filter((t: string) => t.length > 1) // 2글자 이상만
            .filter((t: string) => !isFunctionWord(t)); // 기능어 제외
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
 * - 텍스트/단어가 이미지에 포함되지 않도록 강조
 */
function buildImagePrompt(word: string): string {
  return `Create a simple, clear, and educational illustration of "${word}" for Korean elementary school English learners. 
CRITICAL REQUIREMENTS:
- Absolutely NO text, words, letters, or labels in the image
- NO writing, NO labels, NO captions, NO words of any kind
- The image must be purely visual with zero text elements
- Clean and uncluttered, with a white or light background
- Simple cartoon or clipart style, suitable for children's educational materials
- The main subject should be clearly visible and easily recognizable
- Consistent art style: friendly, colorful, and educational
- The object should be centered and well-lit
- Avoid complex backgrounds or distracting elements
- Make sure the image clearly represents only "${word}" and nothing else that could cause confusion with other words
- Optimize for small file size while maintaining visual quality`;
}

/**
 * Google Gemini API를 사용한 이미지 생성 함수
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
    console.log(`✅ "${word}" 완료 (${originalSize}KB → ${optimizedSize}KB)`);
    
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
const TEST_MODE = false;
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


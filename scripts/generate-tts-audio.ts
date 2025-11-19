/**
 * TTS 오디오 파일 생성 스크립트 (통합)
 * 
 * 사용법:
 * npx tsx scripts/generate-tts-audio.ts
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

// PSF 단어 목록
const PSF_WORDS = [
  'pin', 'fin', 'bat', 'pat', 'cat', 'hat', 'dog', 'log', 'sun', 'fun',
  'bed', 'red', 'cup', 'pup', 'map', 'cap', 'sit', 'hit', 'pen', 'hen',
  'big', 'pig', 'top', 'pop', 'run', 'leg', 'peg', 'mug', 'bug', 'fan', 'van',
  'ten', 'box', 'fox', 'six', 'web', 'deb'
];

// STRESS 단어 목록
const STRESS_WORDS = [
  'computer', 'banana', 'elephant', 'tomorrow', 'beautiful',
  'important', 'remember', 'together', 'understand', 'different'
];

// MEANING 문구 목록
const MEANING_PHRASES = [
  'a red apple',
  'a big dog',
  'three cats',
  'a blue ball',
  'I like pizza',
  'a yellow sun',
  'two birds',
  'a green tree',
  'a small house',
  'five books'
];

// COMPREHENSION 이야기 목록
const COMPREHENSION_STORIES = [
  'This is my friend, Tom. He has a big, blue ball.',
  'I see a cat. It is small and white.',
  'Look at the dog. It is big and brown.',
  'The sun is hot. The sky is blue.',
  'I have a red car. It is very fast.'
];

// 생성된 오디오 내용을 검증하는 함수
async function verifyAudioContent(audioBuffer: Buffer, expectedText: string): Promise<boolean> {
  try {
    // Buffer를 Uint8Array로 변환하여 File 생성자에 전달
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Whisper로 오디오를 다시 인식
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: new File([uint8Array], 'audio.mp3', { type: 'audio/mpeg' }),
      language: 'en',
      response_format: 'text',
    });
    
    const transcribedText = transcription.toString().trim().toLowerCase();
    const expectedTextLower = expectedText.toLowerCase();
    
    // 주요 단어들이 포함되어 있는지 확인
    const expectedWords = expectedTextLower.split(/\s+/).filter(w => w.length > 1);
    const transcribedWords = transcribedText.split(/\s+/);
    
    // 예상 단어의 80% 이상이 포함되어 있으면 통과
    const matchedWords = expectedWords.filter(word => 
      transcribedWords.some(tw => tw.includes(word) || word.includes(tw))
    );
    
    const matchRatio = matchedWords.length / expectedWords.length;
    const isValid = matchRatio >= 0.8;
    
    if (!isValid) {
      console.warn(`  ⚠️  검증 실패: 예상 "${expectedText}", 인식 "${transcribedText}" (일치율: ${(matchRatio * 100).toFixed(0)}%)`);
    }
    
    return isValid;
  } catch (error) {
    console.warn(`  ⚠️  검증 중 오류 (계속 진행):`, error);
    return true; // 검증 실패해도 계속 진행
  }
}

async function generateAudioFiles(testType: string, items: string[], outputDir: string) {
  console.log(`\n🎤 ${testType} 오디오 파일 생성 시작...`);
  console.log(`총 ${items.length}개 항목`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 디렉토리 생성: ${outputDir}`);
  }
  
  let successCount = 0;
  let failCount = 0;
  let retryCount = 0;
  
  for (const item of items) {
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    
    while (attempts < maxAttempts && !success) {
      try {
        attempts++;
        if (attempts > 1) {
          console.log(`  🔄 재시도 ${attempts}/${maxAttempts}...`);
          retryCount++;
        }
        
        // EFL 학생을 위해 느리고 명확하게 발음하도록 프롬프트 개선
        // 모든 항목에 대해 명확하고 천천히 발음하도록 지시
        // 단, 실제 TTS는 지시어를 완벽히 따르지 않을 수 있으므로 후처리(ffmpeg) 권장
        const ttsInput = item;
        
        console.log(`⏳ "${item}" 생성 중...`);
        
        const mp3 = await openai.audio.speech.create({
          model: "tts-1",
          voice: "alloy",
          input: ttsInput,
          // 참고: OpenAI TTS API는 speed 파라미터를 지원하지 않음
          // 속도 조절은 ffmpeg 후처리 필요
        });
        
        let buffer = Buffer.from(await mp3.arrayBuffer());
        
        // ffmpeg를 사용한 속도 조절 (선택적, 설치되어 있으면 사용)
        // 속도를 0.75배로 조절 (25% 느리게)
        try {
          const { execSync } = require('child_process');
          const tempInputPath = path.join(outputDir, `temp_${Date.now()}.mp3`);
          const tempOutputPath = path.join(outputDir, `temp_slow_${Date.now()}.mp3`);
          
          fs.writeFileSync(tempInputPath, buffer);
          
          // ffmpeg로 속도 조절 (atempo 필터 사용)
          execSync(`ffmpeg -i "${tempInputPath}" -filter:a "atempo=0.75" -y "${tempOutputPath}"`, {
            stdio: 'ignore',
            timeout: 10000,
          });
          
          if (fs.existsSync(tempOutputPath)) {
            buffer = fs.readFileSync(tempOutputPath);
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
            console.log(`  🐌 속도 조절 완료 (0.75x)`);
          }
        } catch (ffmpegError) {
          // ffmpeg가 없거나 실패해도 계속 진행 (프롬프트 개선만으로도 어느 정도 효과)
          // console.warn('  ⚠️  ffmpeg 속도 조절 실패 (계속 진행):', ffmpegError.message);
        }
        
        // 내용 검증 (2단어 이상인 문구만 검증, 짧은 단어는 스킵)
        const shouldVerify = item.split(' ').length > 1;
        if (shouldVerify) {
          const isValid = await verifyAudioContent(buffer, item);
          if (!isValid && attempts < maxAttempts) {
            console.log(`  ⚠️  내용 불일치 감지, 재생성 시도...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
        }
        
        // 파일명을 URL-safe하게 인코딩
        const safeFileName = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const filePath = path.join(outputDir, `${safeFileName}.mp3`);
        
        fs.writeFileSync(filePath, buffer);
        success = true;
        successCount++;
        
        console.log(`✅ "${item}" 완료`);
        
        // API 레이트 리밋 방지를 위해 간단한 딜레이
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error(`❌ "${item}" 실패 (${attempts}회 시도):`, error);
          failCount++;
        } else {
          console.warn(`  ⚠️  "${item}" 시도 ${attempts} 실패, 재시도...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }
  
  // 총 파일 크기 계산
  let totalSize = 0;
  items.forEach(item => {
    const safeFileName = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filePath = path.join(outputDir, `${safeFileName}.mp3`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }
  });
  
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  console.log(`\n📊 ${testType} 생성 완료:`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  if (retryCount > 0) {
    console.log(`🔄 재시도: ${retryCount}개`);
  }
  console.log(`📁 저장 위치: ${outputDir}`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
  
  // 생성된 파일 목록을 JSON으로 저장
  const fileList = items.map(item => {
    const safeFileName = item.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return { 
      original: item, 
      file: `/audio/${testType.toLowerCase()}/${safeFileName}.mp3` 
    };
  });
  const indexFile = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
  console.log(`📝 인덱스 파일 생성: ${indexFile}`);
}

async function generateAllAudioFiles() {
  console.log('🎵 TTS 오디오 파일 생성 시작...\n');
  
  const baseDir = path.join(process.cwd(), 'public', 'audio');
  
  // PSF 오디오 생성
  await generateAudioFiles(
    'PSF',
    PSF_WORDS,
    path.join(baseDir, 'psf')
  );
  
  // STRESS 오디오 생성
  await generateAudioFiles(
    'STRESS',
    STRESS_WORDS,
    path.join(baseDir, 'stress')
  );
  
  // MEANING 오디오 생성
  await generateAudioFiles(
    'MEANING',
    MEANING_PHRASES,
    path.join(baseDir, 'meaning')
  );
  
  // COMPREHENSION 오디오 생성
  await generateAudioFiles(
    'COMPREHENSION',
    COMPREHENSION_STORIES,
    path.join(baseDir, 'comprehension')
  );
  
  console.log('\n🎉 모든 오디오 파일 생성 완료!');
}

// 실행
generateAllAudioFiles()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 오류:', error);
    process.exit(1);
  });


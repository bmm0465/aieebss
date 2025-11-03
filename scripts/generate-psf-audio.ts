/**
 * PSF 단어 TTS 오디오 파일 생성 스크립트
 * 
 * 사용법:
 * npx tsx scripts/generate-psf-audio.ts
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

const PSF_WORDS = [
  // 초기 20개: 주로 2-3음소 단어로 구성
  "go", "on", "at", "up", "be", "it", "so", "in", "to", "an",
  "dad", "sit", "map", "cup", "top", "pen", "cat", "dog", "get", "hot",
  
  // 21-50: 2-3음소와 일부 4음소 혼합
  "mad", "van", "pin", "son", "rug", "hit", "nut", "box", "bat", "bug",
  "win", "web", "mug", "man", "pig", "dig", "pot", "bed", "mom", "fan",
  "wig", "car", "fog", "leg", "ten", "hen", "jog", "kid", "fit", "but",
  
  // 51-80: 다양한 음소 수 균형있게 혼합
  "red", "sun", "jam", "mud", "hug", "run", "cut", "not", "tap", "pet",
  "bell", "stop", "plan", "hand", "gift", "star", "belt", "doll", "gold", "sand",
  "dot", "big", "sip", "mop", "lid", "lip", "fin", "kit", "had", "can",
  
  // 81-110: 계속 혼합하되 더 복잡한 단어들 포함
  "zoo", "hop", "hat", "six", "rock", "road", "pan", "jet", "bib", "ship",
  "desk", "ski", "pull", "toad", "cold", "crab", "lamp", "drum", "nest", "tent",
  "milk", "pond", "coin", "deep", "moon", "heel", "frog", "camp", "farm", "star"
];

async function generateAudioFiles() {
  console.log('🎤 PSF 오디오 파일 생성 시작...');
  console.log(`총 ${PSF_WORDS.length}개 단어`);
  
  // public/audio/psf 디렉토리 생성
  const outputDir = path.join(process.cwd(), 'public', 'audio', 'psf');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 디렉토리 생성: ${outputDir}`);
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (const word of PSF_WORDS) {
    try {
      console.log(`⏳ "${word}" 생성 중...`);
      
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: word,
      });
      
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const filePath = path.join(outputDir, `${word}.mp3`);
      
      fs.writeFileSync(filePath, buffer);
      successCount++;
      
      console.log(`✅ "${word}" 완료`);
      
      // API 레이트 리밋 방지를 위해 간단한 딜레이
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ "${word}" 실패:`, error);
      failCount++;
    }
  }
  
  // 총 파일 크기 계산
  let totalSize = 0;
  PSF_WORDS.forEach(word => {
    const filePath = path.join(outputDir, `${word}.mp3`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }
  });
  
  const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  
  console.log('\n📊 생성 완료:');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📁 저장 위치: ${outputDir}`);
  console.log(`💾 총 용량: ${totalSizeMB} MB`);
  
  // 생성된 파일 목록을 JSON으로 저장
  const fileList = PSF_WORDS.map(word => ({ word, file: `/audio/psf/${word}.mp3` }));
  const indexFile = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(fileList, null, 2));
  console.log(`📝 인덱스 파일 생성: ${indexFile}`);
}

// 실행
generateAudioFiles()
  .then(() => {
    console.log('\n🎉 모든 오디오 파일 생성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 오류:', error);
    process.exit(1);
  });


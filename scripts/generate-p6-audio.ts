/**
 * 6교시 시험용 TTS 오디오 파일 생성 스크립트
 * 
 * 생성 항목:
 * - 20개 대화 상황의 A와 B 음성 파일
 * - 각 대화별로 남학생/여학생 성별 구분하여 음성 생성
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

// 대화 항목 인터페이스
interface DialogueItem {
  questionNumber: number;
  question: string;
  dialogue: {
    A: string;
    B: string;
  };
  gender: {
    A: 'male' | 'female'; // A의 성별
    B: 'male' | 'female'; // B의 성별
  };
}

// 20개 대화 상황 정의
const DIALOGUE_ITEMS: DialogueItem[] = [
  {
    questionNumber: 1,
    question: '두 사람이 이야기하고 있는 음식은 무엇인가요?',
    dialogue: {
      A: 'Do you like pizza?',
      B: 'Yes, I do. I like pizza.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 2,
    question: '사자의 크기는 어떠한가요?',
    dialogue: {
      A: 'Look at the lion.',
      B: 'Wow! It\'s big.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 3,
    question: '여학생이 가지고 있는 크레용의 색깔은 무엇인가요?',
    dialogue: {
      A: 'Do you have a crayon?',
      B: 'Yes. It\'s yellow.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 4,
    question: '남학생이 소개하는 사람은 누구인가요?',
    dialogue: {
      A: 'Who is he?',
      B: 'He\'s my dad.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 5,
    question: '여학생이 설명하고 있는 물건은 무엇인가요?',
    dialogue: {
      A: 'What\'s this?',
      B: 'It\'s a cup. It\'s nice.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 6,
    question: '가방의 크기는 어떠한가요?',
    dialogue: {
      A: 'What\'s that?',
      B: 'It\'s a bag. It\'s small.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 7,
    question: '강아지의 색깔은 무엇인가요?',
    dialogue: {
      A: 'Look at the dog.',
      B: 'It\'s black. It\'s cute.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 8,
    question: '여학생이 가리키는 사람은 누구인가요?',
    dialogue: {
      A: 'Who is she?',
      B: 'She\'s my grandmother.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 9,
    question: '남학생은 무엇을 할 수 있나요?',
    dialogue: {
      A: 'Can you jump?',
      B: 'Yes, I can. I can jump.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 10,
    question: '곰의 모습으로 알맞은 것을 고르세요.',
    dialogue: {
      A: 'Is it a bear?',
      B: 'Yes, it is. It\'s big.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 11,
    question: '남학생이 가리키는 새의 색깔은 무엇인가요?',
    dialogue: {
      A: 'Look! It\'s a bird.',
      B: 'Oh, it\'s blue.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 12,
    question: '사진 속의 인물은 누구인가요?',
    dialogue: {
      A: 'Who is he?',
      B: 'He\'s my brother. He\'s tall.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 13,
    question: '여학생이 잘하는 운동은 무엇인가요?',
    dialogue: {
      A: 'I can skate. Look at me!',
      B: 'Wow, great!',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 14,
    question: '물고기의 크기는 어떠한가요?',
    dialogue: {
      A: 'Look at the fish.',
      B: 'It\'s small. It\'s cute.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 15,
    question: '고양이의 색깔은 무엇인가요?',
    dialogue: {
      A: 'Is it a cat?',
      B: 'Yes. It\'s white.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 16,
    question: '두 사람이 이야기하고 있는 대상은 누구인가요?',
    dialogue: {
      A: 'Who is she?',
      B: 'She\'s my sister. She\'s pretty.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 17,
    question: '창밖의 날씨는 어떠한가요?',
    dialogue: {
      A: 'How\'s the weather?',
      B: 'It\'s raining. Take an umbrella.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 18,
    question: '남학생이 설명하는 공의 크기는 어떠한가요?',
    dialogue: {
      A: 'Do you have a ball?',
      B: 'Yes. It\'s big.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
  {
    questionNumber: 19,
    question: '가방의 색깔로 알맞은 것을 고르세요.',
    dialogue: {
      A: 'What color is it?',
      B: 'It\'s green.',
    },
    gender: { A: 'male', B: 'female' }, // A(남학생) B(여학생)
  },
  {
    questionNumber: 20,
    question: '남학생이 소개하는 사람은 누구인가요?',
    dialogue: {
      A: 'Who is he?',
      B: 'He\'s my grandfather.',
    },
    gender: { A: 'female', B: 'male' }, // A(여학생) B(남학생)
  },
];

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
 * 성별에 맞는 음성 모델 반환
 */
function getVoiceForGender(gender: 'male' | 'female'): 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' {
  // 남학생: echo (더 명확한 남성 음성) 또는 onyx (딥한 남성 음성)
  // 여학생: nova (밝은 여성 음성) 또는 shimmer (부드러운 여성 음성)
  if (gender === 'male') {
    return 'echo'; // 남학생
  } else {
    return 'nova'; // 여학생
  }
}

/**
 * TTS로 오디오 파일 생성
 * @param text - 생성할 텍스트
 * @param outputPath - 출력 경로
 * @param gender - 성별 ('male' | 'female')
 * @param description - 설명
 * @param forceRegenerate - 강제 재생성 여부
 */
async function generateAudioFile(
  text: string,
  outputPath: string,
  gender: 'male' | 'female',
  description: string,
  forceRegenerate: boolean = false
): Promise<boolean> {
  try {
    // 강제 재생성 모드가 아니면 이미 파일이 존재하면 스킵
    if (!forceRegenerate && fs.existsSync(outputPath)) {
      console.log(`⏭️  "${text}" 이미 존재, 스킵`);
      return true;
    }
    
    // 강제 재생성 모드면 기존 파일 삭제
    if (forceRegenerate && fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`🔄 "${text}" 기존 파일 삭제 후 재생성...`);
    }

    const voice = getVoiceForGender(gender);
    const genderLabel = gender === 'male' ? '남학생' : '여학생';
    
    console.log(`⏳ "${text}" (${description}, ${genderLabel}, ${voice}) 생성 중...`);
    
    // gpt-4o-mini-tts 모델 사용 (instructions 지원)
    const instruction = "Speak naturally and clearly. This is for beginner English learners. Use natural intonation for questions and statements. Pronounce each word clearly but at a conversational pace suitable for young students.";
    
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice,
      input: text,
      instructions: instruction,
      speed: 0.9, // 약간 느리게
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // 디렉토리가 없으면 생성
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ "${text}" 완료 → ${path.basename(outputPath)}`);
    
    // API 레이트 리밋 방지를 위해 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error: any) {
    console.error(`❌ "${text}" 실패:`, error?.message || error);
    return false;
  }
}

/**
 * 6교시 대화 오디오 파일 생성
 */
async function generateP6Audio() {
  console.log('\n🎤 6교시 대화 오디오 파일 생성 시작...');
  console.log(`총 ${DIALOGUE_ITEMS.length}개 대화 상황 처리\n`);
  
  // p6_comprehension 폴더에 직접 저장
  const baseDir = path.join(process.cwd(), 'public', 'audio', 'p6_comprehension');
  
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  
  // 고유한 대화 문장 수집 (텍스트와 성별 정보 함께 저장)
  interface UniqueDialogue {
    text: string;
    gender: 'male' | 'female';
    questionNumbers: number[];
  }
  
  const uniqueSpeakerATexts = new Map<string, UniqueDialogue>(); // text -> {gender, questionNumbers}
  const uniqueSpeakerBTexts = new Map<string, UniqueDialogue>(); // text -> {gender, questionNumbers}
  
  for (const item of DIALOGUE_ITEMS) {
    // Speaker A 텍스트 처리
    const textA = item.dialogue.A;
    if (!uniqueSpeakerATexts.has(textA)) {
      uniqueSpeakerATexts.set(textA, {
        text: textA,
        gender: item.gender.A,
        questionNumbers: [item.questionNumber],
      });
    } else {
      uniqueSpeakerATexts.get(textA)!.questionNumbers.push(item.questionNumber);
    }
    
    // Speaker B 텍스트 처리
    const textB = item.dialogue.B;
    if (!uniqueSpeakerBTexts.has(textB)) {
      uniqueSpeakerBTexts.set(textB, {
        text: textB,
        gender: item.gender.B,
        questionNumbers: [item.questionNumber],
      });
    } else {
      uniqueSpeakerBTexts.get(textB)!.questionNumbers.push(item.questionNumber);
    }
  }
  
  console.log(`\n📊 고유한 대화 문장:`);
  console.log(`  - Speaker A: ${uniqueSpeakerATexts.size}개`);
  console.log(`  - Speaker B: ${uniqueSpeakerBTexts.size}개`);
  console.log(`  - 총 ${uniqueSpeakerATexts.size + uniqueSpeakerBTexts.size}개 음성 파일 생성 예정\n`);
  
  // Speaker A 음성 생성
  console.log(`\n🎙️  Speaker A 음성 생성...`);
  for (const dialogue of uniqueSpeakerATexts.values()) {
    const fileName = `A_${textToFileName(dialogue.text)}.mp3`;
    const outputPath = path.join(baseDir, fileName);
    const description = `Speaker A (문항 ${dialogue.questionNumbers.join(', ')})`;
    
    const result = await generateAudioFile(
      dialogue.text,
      outputPath,
      dialogue.gender,
      description
    );
    
    if (result) {
      if (fs.existsSync(outputPath)) {
        successCount++;
      } else {
        skipCount++;
      }
    } else {
      failCount++;
    }
    
    console.log(''); // 빈 줄로 구분
  }
  
  // Speaker B 음성 생성
  console.log(`\n🎙️  Speaker B 음성 생성...`);
  for (const dialogue of uniqueSpeakerBTexts.values()) {
    const fileName = `B_${textToFileName(dialogue.text)}.mp3`;
    const outputPath = path.join(baseDir, fileName);
    const description = `Speaker B (문항 ${dialogue.questionNumbers.join(', ')})`;
    
    const result = await generateAudioFile(
      dialogue.text,
      outputPath,
      dialogue.gender,
      description
    );
    
    if (result) {
      if (fs.existsSync(outputPath)) {
        successCount++;
      } else {
        skipCount++;
      }
    } else {
      failCount++;
    }
    
    console.log(''); // 빈 줄로 구분
  }
  
  // 인덱스 파일 생성
  const indexFile = path.join(baseDir, 'index.json');
  const indexData = {
    dialogues: DIALOGUE_ITEMS.map(item => ({
      questionNumber: item.questionNumber,
      question: item.question,
      dialogue: {
        A: {
          text: item.dialogue.A,
          gender: item.gender.A,
          file: `/audio/p6_comprehension/A_${textToFileName(item.dialogue.A)}.mp3`,
        },
        B: {
          text: item.dialogue.B,
          gender: item.gender.B,
          file: `/audio/p6_comprehension/B_${textToFileName(item.dialogue.B)}.mp3`,
        },
      },
    })),
  };
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
  console.log(`📝 인덱스 파일 생성: ${indexFile}`);
  
  console.log(`\n✨ 완료!`);
  console.log(`  - 성공: ${successCount}개`);
  console.log(`  - 스킵: ${skipCount}개`);
  console.log(`  - 실패: ${failCount}개`);
  console.log(`\n📁 생성된 파일 위치:`);
  console.log(`  - 모든 음성 파일: ${baseDir}`);
  console.log(`  - 인덱스 파일: ${indexFile}`);
}

// 메인 실행
generateP6Audio()
  .then(() => {
    console.log('\n🎉 모든 대화 오디오 파일 생성 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실행 오류:', error);
    process.exit(1);
  });


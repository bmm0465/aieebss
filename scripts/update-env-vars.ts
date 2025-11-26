import 'dotenv/config';
import { readFile, writeFile, access } from 'fs/promises';
import { constants } from 'fs';

interface EnvVarUpdate {
  oldValue?: string;
  newValue: string;
  description: string;
  required: boolean;
}

/**
 * 환경변수 업데이트 스크립트
 * 
 * 새 프로젝트(AIEEBSS) 정보로 환경변수 파일을 업데이트합니다.
 * 
 * 사용법:
 *   npx tsx scripts/update-env-vars.ts                    # Dry-run
 *   npx tsx scripts/update-env-vars.ts --execute          # 실제 업데이트
 * 
 * 환경 변수 (.env.local 파일 필요):
 *   # 새 프로젝트 정보
 *   NEW_SUPABASE_URL
 *   NEW_SUPABASE_ANON_KEY
 *   NEW_SUPABASE_SERVICE_ROLE_KEY
 */
async function updateEnvVars(execute: boolean) {
  console.log('🔄 환경변수 업데이트 시작...\n');
  console.log(`모드: ${execute ? '✅ 실행 모드' : '👀 Dry-run 모드 (실제 업데이트 없음)'}\n`);

  const newSupabaseUrl = process.env.NEW_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const newSupabaseAnonKey = process.env.NEW_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const newSupabaseServiceKey = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!newSupabaseUrl || !newSupabaseAnonKey || !newSupabaseServiceKey) {
    console.error('❌ 새 프로젝트 환경변수가 설정되지 않았습니다.');
    console.error('   다음 중 하나를 설정하세요:');
    console.error('   - NEW_SUPABASE_URL, NEW_SUPABASE_ANON_KEY, NEW_SUPABASE_SERVICE_ROLE_KEY');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const updates: Record<string, EnvVarUpdate> = {
    NEXT_PUBLIC_SUPABASE_URL: {
      newValue: newSupabaseUrl,
      description: 'Supabase 프로젝트 URL',
      required: true,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      newValue: newSupabaseAnonKey,
      description: 'Supabase Anon Key',
      required: true,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      newValue: newSupabaseServiceKey,
      description: 'Supabase Service Role Key',
      required: true,
    },
  };

  // .env.local 파일 읽기
  const envFilePath = '.env.local';
  let envContent = '';

  try {
    await access(envFilePath, constants.F_OK);
    envContent = await readFile(envFilePath, 'utf-8');
    console.log(`📄 기존 .env.local 파일을 찾았습니다.\n`);
  } catch {
    console.log(`📄 .env.local 파일이 없습니다. 새로 생성합니다.\n`);
  }

  // 기존 값 확인
  const lines = envContent.split('\n');
  const existingVars: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        existingVars[key] = value;
        
        if (updates[key]) {
          updates[key].oldValue = value;
        }
      }
    }
  }

  // 업데이트 내용 출력
  console.log('📋 업데이트 계획:');
  console.log('='.repeat(60));
  
  for (const [key, update] of Object.entries(updates)) {
    if (update.oldValue) {
      console.log(`${key}:`);
      console.log(`   기존: ${update.oldValue.substring(0, 30)}...`);
      console.log(`   새:   ${update.newValue.substring(0, 30)}...`);
      if (update.oldValue === update.newValue) {
        console.log(`   ℹ️  변경 없음`);
      }
    } else {
      console.log(`${key}:`);
      console.log(`   새:   ${update.newValue.substring(0, 30)}... (추가)`);
    }
    console.log();
  }

  if (!execute) {
    console.log('👀 Dry-run 모드: 실제로는 업데이트되지 않았습니다.');
    console.log('   --execute 플래그를 사용하여 실제 업데이트를 실행하세요.\n');
    return;
  }

  // 실제 업데이트
  console.log('🔄 .env.local 파일 업데이트 중...\n');

  const updatedLines: string[] = [];
  const updatedKeys = new Set<string>();

  // 기존 라인 처리
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      // 주석이나 빈 줄은 그대로 유지
      updatedLines.push(line);
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      
      if (updates[key]) {
        // 업데이트할 변수
        updatedLines.push(`${key}=${updates[key].newValue}`);
        updatedKeys.add(key);
      } else {
        // 기존 변수 유지
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }

  // 새 변수 추가
  for (const [key, update] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      updatedLines.push(`# ${update.description}`);
      updatedLines.push(`${key}=${update.newValue}`);
    }
  }

  // 파일 쓰기
  const newContent = updatedLines.join('\n');
  await writeFile(envFilePath, newContent, 'utf-8');

  console.log('✅ .env.local 파일 업데이트 완료!\n');

  // Vercel 환경변수 업데이트 안내
  console.log('='.repeat(60));
  console.log('📋 다음 단계: Vercel 환경변수 업데이트');
  console.log('='.repeat(60));
  console.log('\nVercel 대시보드에서 다음 환경변수를 업데이트하세요:\n');
  
  for (const [key, update] of Object.entries(updates)) {
    console.log(`${key}`);
    console.log(`  ${update.newValue.substring(0, 50)}...`);
    console.log();
  }

  console.log('또는 Vercel CLI를 사용하여 업데이트할 수 있습니다:');
  console.log('  vercel env add NEXT_PUBLIC_SUPABASE_URL');
  console.log('  vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('  vercel env add SUPABASE_SERVICE_ROLE_KEY');
  console.log();
}

async function main() {
  // 명령줄 인자 파싱
  const args = process.argv.slice(2);
  const execute = args.includes('--execute') || args.includes('-e');

  await updateEnvVars(execute);
}

main().catch((error) => {
  console.error('💥 환경변수 업데이트 중 오류 발생:', error);
  process.exit(1);
});


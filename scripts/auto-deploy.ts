#!/usr/bin/env tsx
/**
 * 자동 배포 및 모니터링 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/auto-deploy.ts [커밋 메시지]
 * 
 * 기능:
 * 1. 변경사항 자동 커밋 및 푸시
 * 2. Vercel 배포 상태 모니터링
 * 3. 빌드 에러 자동 감지 및 로그 추출
 * 4. 에러 발생 시 자동으로 피드백 생성
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DeploymentStatus {
  success: boolean;
  deploymentId?: string;
  error?: string;
  buildLogs?: string;
}

// Git 상태 확인
function checkGitStatus(): { hasChanges: boolean; status: string } {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    return {
      hasChanges: status.trim().length > 0,
      status: status.trim() || 'No changes',
    };
  } catch (error) {
    console.error('❌ Git 상태 확인 실패:', error);
    return { hasChanges: false, status: 'Error checking git status' };
  }
}

// Git 커밋 및 푸시
function commitAndPush(message: string): boolean {
  try {
    console.log('📝 변경사항 스테이징...');
    execSync('git add .', { stdio: 'inherit' });

    console.log(`💾 커밋: "${message}"`);
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });

    console.log('🚀 푸시 중...');
    execSync('git push', { stdio: 'inherit' });

    console.log('✅ Git 푸시 완료');
    return true;
  } catch (error) {
    console.error('❌ Git 푸시 실패:', error);
    return false;
  }
}

// Vercel 프로젝트 정보 읽기
function getVercelProjectInfo(): { projectId?: string; teamId?: string } {
  const vercelPath = join(process.cwd(), '.vercel', 'project.json');
  if (existsSync(vercelPath)) {
    try {
      const project = JSON.parse(readFileSync(vercelPath, 'utf-8'));
      return {
        projectId: project.projectId,
        teamId: project.orgId,
      };
    } catch (error) {
      console.warn('⚠️  Vercel 프로젝트 정보 읽기 실패:', error);
    }
  }
  return {};
}

// 배포 상태 확인 (간단한 버전 - 실제로는 Vercel API나 MCP 사용)
function waitForDeployment(maxWaitMinutes: number = 10): Promise<DeploymentStatus> {
  return new Promise((resolve) => {
    console.log(`⏳ 배포 상태 확인 중... (최대 ${maxWaitMinutes}분)`);
    console.log('💡 Vercel 대시보드에서 배포 상태를 확인하세요: https://vercel.com');
    console.log('💡 MCP를 통해 자동으로 확인하려면 Vercel MCP 설정이 필요합니다.');
    
    // 실제 구현에서는 Vercel API나 MCP를 사용하여 배포 상태를 확인
    // 여기서는 사용자에게 안내만 제공
    setTimeout(() => {
      resolve({
        success: false,
        error: '자동 확인 미구현. Vercel 대시보드에서 수동 확인 필요',
      });
    }, 1000);
  });
}

// 빌드 로그에서 에러 추출
function extractBuildErrors(logs: string): string {
  const errorPatterns = [
    /Failed to compile[\s\S]*?(?=\n\n|$)/g,
    /Error:[\s\S]*?(?=\n\n|$)/g,
    /Type error:[\s\S]*?(?=\n\n|$)/g,
  ];

  const errors: string[] = [];
  for (const pattern of errorPatterns) {
    const matches = logs.match(pattern);
    if (matches) {
      errors.push(...matches);
    }
  }

  return errors.length > 0 ? errors.join('\n\n') : logs;
}

// 메인 함수
async function main() {
  const commitMessage = process.argv[2] || 'Auto commit: code changes';

  console.log('🤖 자동 배포 워크플로우 시작\n');

  // 1. Git 상태 확인
  const gitStatus = checkGitStatus();
  if (!gitStatus.hasChanges) {
    console.log('ℹ️  변경사항이 없습니다. 배포를 건너뜁니다.');
    return;
  }

  console.log('📊 변경사항:');
  console.log(gitStatus.status);
  console.log('');

  // 2. 커밋 및 푸시
  if (!commitAndPush(commitMessage)) {
    console.error('❌ Git 푸시 실패로 인해 배포를 중단합니다.');
    process.exit(1);
  }

  // 3. Vercel 프로젝트 정보 확인
  const vercelInfo = getVercelProjectInfo();
  if (vercelInfo.projectId) {
    console.log(`📦 Vercel 프로젝트 ID: ${vercelInfo.projectId}`);
  }

  // 4. 배포 상태 확인 안내
  console.log('\n📋 다음 단계:');
  console.log('1. Vercel 대시보드에서 배포 상태 확인');
  console.log('2. 빌드 에러 발생 시 Build Logs 복사');
  console.log('3. 에러 로그를 Cursor에 입력하여 수정');
  console.log('\n💡 자동화를 완전히 구현하려면:');
  console.log('   - Vercel MCP 설정');
  console.log('   - 또는 Vercel API 토큰 사용');
}

main().catch(console.error);


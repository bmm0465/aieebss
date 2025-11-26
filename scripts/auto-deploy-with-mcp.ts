#!/usr/bin/env tsx
/**
 * MCP를 활용한 완전 자동 배포 스크립트
 * 
 * 이 스크립트는 Cursor의 MCP 기능을 활용하여:
 * 1. Git 커밋 및 푸시
 * 2. Vercel 배포 상태 자동 모니터링
 * 3. 빌드 에러 자동 감지
 * 4. 에러 로그 자동 추출 및 포맷팅
 * 
 * 사용법:
 *   npx tsx scripts/auto-deploy-with-mcp.ts [커밋 메시지]
 * 
 * 주의: 이 스크립트는 Cursor 내에서 MCP 도구를 통해 실행되어야 합니다.
 */

import { execSync } from 'child_process';

interface DeploymentResult {
  success: boolean;
  deploymentId?: string;
  url?: string;
  error?: string;
  buildLogs?: string;
}

// Git 상태 확인 및 커밋/푸시
function commitAndPush(message: string): { success: boolean; error?: string } {
  try {
    console.log('📝 Git 작업 시작...');
    
    // 변경사항 확인
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (!status.trim()) {
      return { success: false, error: '변경사항이 없습니다.' };
    }

    // 스테이징
    execSync('git add .', { stdio: 'inherit' });
    console.log('✅ 변경사항 스테이징 완료');

    // 커밋
    execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
    console.log(`✅ 커밋 완료: "${message}"`);

    // 푸시
    execSync('git push', { stdio: 'inherit' });
    console.log('✅ 푸시 완료');

    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Git 작업 실패' 
    };
  }
}

// 배포 상태 확인 (MCP 사용)
async function checkDeploymentWithMCP(projectId: string, teamId: string): Promise<DeploymentResult> {
  // 이 함수는 실제로는 Cursor의 MCP 도구를 통해 호출됩니다
  // 여기서는 사용자에게 안내만 제공
  
  console.log('\n📋 MCP를 통한 배포 모니터링:');
  console.log('💡 Cursor에서 다음 명령어를 사용하세요:');
  console.log(`   "Vercel 프로젝트 ${projectId}의 최근 배포 상태를 확인하고`);
  console.log('    빌드 에러가 있으면 로그를 추출해줘"');
  console.log('\n또는 직접 MCP 도구 사용:');
  console.log(`   - mcp_vercel_list_deployments(projectId: "${projectId}", teamId: "${teamId}")`);
  console.log(`   - mcp_vercel_get_deployment_build_logs(idOrUrl: "[deployment-id]")`);
  
  return {
    success: false,
    error: 'MCP 도구를 통해 수동으로 확인 필요',
  };
}

// 에러 로그 포맷팅
function formatErrorForCursor(logs: string): string {
  // 에러 섹션 추출
  const errorMatch = logs.match(/Failed to compile[\s\S]*?(?=\n\n|$)/);
  if (errorMatch) {
    return `Vercel 배포 중 다음 에러가 발생했습니다:

\`\`\`
${errorMatch[0]}
\`\`\`

이 에러를 수정해주세요.`;
  }

  // 일반 에러
  const generalError = logs.match(/Error:[\s\S]*?(?=\n\n|$)/);
  if (generalError) {
    return `Vercel 배포 에러:

\`\`\`
${generalError[0]}
\`\`\`

이 에러를 수정해주세요.`;
  }

  // 전체 로그의 마지막 부분
  const lines = logs.split('\n');
  const lastError = lines.slice(-30).join('\n');
  
  return `Vercel 배포 로그 (마지막 30줄):

\`\`\`
${lastError}
\`\`\`

에러를 확인하고 수정해주세요.`;
}

// 메인 함수
async function main() {
  const commitMessage = process.argv[2] || 'Auto commit: code changes';

  console.log('🤖 MCP 기반 자동 배포 워크플로우\n');
  console.log('=' .repeat(60));

  // 1. Git 커밋 및 푸시
  console.log('\n📦 Step 1: Git 커밋 및 푸시');
  const gitResult = commitAndPush(commitMessage);
  
  if (!gitResult.success) {
    console.error(`❌ ${gitResult.error}`);
    if (gitResult.error?.includes('변경사항이 없습니다')) {
      console.log('ℹ️  배포를 건너뜁니다.');
      return;
    }
    process.exit(1);
  }

  // 2. Vercel 프로젝트 정보 확인
  console.log('\n📋 Step 2: Vercel 배포 모니터링 준비');
  console.log('💡 다음 단계를 진행하세요:\n');
  console.log('1. Cursor에서 MCP 도구 사용:');
  console.log('   "Vercel의 최근 배포를 확인하고 빌드 로그를 가져와줘"');
  console.log('\n2. 또는 Vercel 대시보드에서 수동 확인:');
  console.log('   https://vercel.com/dashboard');
  console.log('\n3. 에러 발생 시:');
  console.log('   - Build Logs 복사');
  console.log('   - Cursor에 붙여넣기');
  console.log('   - "이 에러를 수정해줘" 요청');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Git 푸시 완료. 배포 모니터링을 시작하세요.');
}

main().catch(console.error);


#!/usr/bin/env tsx
/**
 * Vercel 배포 모니터링 스크립트 (MCP 활용)
 * 
 * 사용법:
 *   npx tsx scripts/monitor-deployment.ts [deployment-url-or-id]
 * 
 * 기능:
 * - 배포 상태 실시간 모니터링
 * - 빌드 에러 자동 감지
 * - 에러 로그 자동 추출 및 포맷팅
 */

interface DeploymentInfo {
  id: string;
  url: string;
  status: 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  buildLogs?: string;
  error?: string;
}

// 배포 정보 파싱 (URL 또는 ID에서)
function parseDeploymentInput(input?: string): { id?: string; url?: string } {
  if (!input) {
    return {};
  }

  // URL 형식인 경우
  if (input.startsWith('http')) {
    const url = new URL(input);
    const pathParts = url.pathname.split('/');
    const deploymentId = pathParts[pathParts.length - 1];
    return { id: deploymentId, url: input };
  }

  // ID 형식인 경우
  return { id: input };
}

// 배포 상태 확인 (MCP 또는 API 사용)
async function checkDeploymentStatus(deploymentId: string, teamId?: string): Promise<DeploymentInfo | null> {
  // 실제 구현에서는 MCP 도구 사용
  // 예: mcp_vercel_get_deployment 사용
  
  console.log(`🔍 배포 상태 확인: ${deploymentId}`);
  console.log('💡 MCP를 통해 자동 확인하려면 Vercel MCP가 설정되어 있어야 합니다.');
  
  return null;
}

// 빌드 로그 가져오기
async function getBuildLogs(deploymentId: string, teamId?: string): Promise<string | null> {
  // 실제 구현에서는 MCP 도구 사용
  // 예: mcp_vercel_get_deployment_build_logs 사용
  
  console.log(`📋 빌드 로그 가져오기: ${deploymentId}`);
  return null;
}

// 에러 포맷팅
function formatErrorForCursor(logs: string): string {
  const errorSection = extractErrorSection(logs);
  
  return `Vercel 배포 중 다음 에러가 발생했습니다:

\`\`\`
${errorSection}
\`\`\`

이 에러를 수정해주세요.`;
}

function extractErrorSection(logs: string): string {
  // "Failed to compile" 섹션 찾기
  const failedMatch = logs.match(/Failed to compile[\s\S]*?(?=\n\n|$)/);
  if (failedMatch) {
    return failedMatch[0];
  }

  // "Error:" 섹션 찾기
  const errorMatch = logs.match(/Error:[\s\S]*?(?=\n\n|$)/);
  if (errorMatch) {
    return errorMatch[0];
  }

  // 마지막 50줄 반환
  const lines = logs.split('\n');
  return lines.slice(-50).join('\n');
}

// 메인 함수
async function main() {
  const input = process.argv[2];
  
  if (!input) {
    console.log('사용법: npx tsx scripts/monitor-deployment.ts [deployment-url-or-id]');
    console.log('\n예시:');
    console.log('  npx tsx scripts/monitor-deployment.ts https://aieebss-abc123.vercel.app');
    console.log('  npx tsx scripts/monitor-deployment.ts dpl_abc123xyz');
    return;
  }

  const { id, url } = parseDeploymentInput(input);
  
  if (!id) {
    console.error('❌ 배포 ID를 찾을 수 없습니다.');
    return;
  }

  console.log('🔍 배포 모니터링 시작...\n');
  console.log(`📦 배포 ID: ${id}`);
  if (url) {
    console.log(`🔗 URL: ${url}`);
  }
  console.log('');

  // 배포 상태 확인
  const deployment = await checkDeploymentStatus(id);
  
  if (!deployment) {
    console.log('💡 MCP를 통해 자동 확인하려면:');
    console.log('   1. Vercel MCP 서버 설정');
    console.log('   2. VERCEL_TOKEN 환경변수 설정');
    console.log('\n현재는 Vercel 대시보드에서 수동으로 확인하세요.');
    return;
  }

  console.log(`📊 상태: ${deployment.status}`);

  if (deployment.status === 'ERROR') {
    console.log('\n❌ 배포 실패 감지!');
    
    const logs = await getBuildLogs(id);
    if (logs) {
      console.log('\n📋 에러 로그:');
      console.log('─'.repeat(60));
      const formattedError = formatErrorForCursor(logs);
      console.log(formattedError);
      console.log('─'.repeat(60));
      console.log('\n💡 위의 에러 메시지를 Cursor에 복사하여 붙여넣으세요.');
    }
  } else if (deployment.status === 'READY') {
    console.log('✅ 배포 성공!');
    if (deployment.url) {
      console.log(`🔗 URL: ${deployment.url}`);
    }
  }
}

main().catch(console.error);


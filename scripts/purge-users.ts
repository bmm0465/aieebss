import 'dotenv/config'
import { createServiceClient } from '../src/lib/supabase/server'

// 입력: 삭제할 사용자 ID 목록
const USER_IDS: string[] = [
  '462cfba3-b912-4e8a-99b2-28bf92e01345',
  '8749fec3-5482-4a27-a8c8-2bcf7bc91d04',
  'a8d61fb3-9868-423a-94bf-9bc3e488450e',
  'da68168e-4ab8-4b88-ae07-552cde5d3bec',
  'fd96fbda-ab00-4d95-8978-42c4ddb36bc7',
]

// 기존 포맷에서 사용했던 테스트 유형들
const TEST_TYPES = ['lnf', 'psf', 'nwf', 'wrf', 'orf']

async function listFolderFiles(prefix: string): Promise<string[]> {
  const supabase = createServiceClient()
  const parts = prefix.split('/').filter(Boolean)
  const folder = parts.join('/')
  const { data, error } = await supabase.storage
    .from('student-recordings')
    .list(folder, { limit: 1000 })
  if (error || !data) return []
  return data
    .filter((f) => f.name.endsWith('.webm'))
    .map((f) => (folder ? `${folder}/${f.name}` : f.name))
}

async function purgeOneUser(userId: string) {
  const supabase = createServiceClient()
  console.log(`\n=== 🧹 사용자 정리 시작: ${userId} ===`)

  // 1) DB에서 해당 사용자의 테스트 결과 조회 (audio_url 기반 파일 삭제용)
  const { data: results, error: resErr } = await supabase
    .from('test_results')
    .select('id, audio_url')
    .eq('user_id', userId)

  if (resErr) console.error('결과 조회 실패:', resErr.message)

  const audioPathsFromDb = (results || [])
    .map((r) => r.audio_url)
    .filter((p): p is string => !!p)

  // 2) 레거시 경로(테스트유형/유저ID/)의 파일들 추가 수집
  const legacyPaths: string[] = []
  for (const type of TEST_TYPES) {
    const files = await listFolderFiles(`${type}/${userId}`)
    legacyPaths.push(...files)
  }

  // 3) 스토리지에서 파일 삭제
  const pathsToDelete = Array.from(new Set([...audioPathsFromDb, ...legacyPaths]))
  if (pathsToDelete.length > 0) {
    const { error: delErr } = await supabase.storage
      .from('student-recordings')
      .remove(pathsToDelete)
    if (delErr) console.error('스토리지 삭제 실패:', delErr.message)
    else console.log(`🗑️  스토리지 파일 삭제: ${pathsToDelete.length}개`)
  } else {
    console.log('🗑️  삭제할 스토리지 파일 없음')
  }

  // 4) 의존 관계 레코드 삭제 (존재해도 되고 없어도 됨)
  const tablesToClean = [
    { table: 'teacher_student_assignments', column: 'student_id' },
    { table: 'teacher_student_assignments', column: 'teacher_id' },
    { table: 'test_results', column: 'user_id' },
    { table: 'user_profiles', column: 'id' },
  ] as const

  for (const t of tablesToClean) {
    const { error } = await supabase
      .from(t.table)
      .delete()
      .eq(t.column, userId)
    if (error) console.warn(`경고: ${t.table} 삭제 실패 (${t.column}=${userId}):`, error.message)
  }

  // 5) Auth 사용자 삭제
  try {
    const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
    if (authErr) console.error('Auth 사용자 삭제 실패:', authErr.message)
    else console.log('✅ Auth 사용자 삭제 완료')
  } catch (e) {
    console.error('Auth 삭제 예외:', e)
  }

  console.log(`=== ✅ 사용자 정리 완료: ${userId} ===`)
}

async function main() {
  // 환경변수 체크
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  }

  for (const userId of USER_IDS) {
    await purgeOneUser(userId)
  }

  console.log('\n🎉 전체 작업 완료')
}

main().catch((e) => {
  console.error('실행 오류:', e)
  process.exit(1)
})

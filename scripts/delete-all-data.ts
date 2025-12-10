import 'dotenv/config'
import { createServiceClient } from '../src/lib/supabase/server'

async function deleteAllTestResults() {
  const supabase = createServiceClient()
  console.log('🗑️  test_results 테이블 데이터 삭제 중...')
  
  const { error } = await supabase
    .from('test_results')
    .delete()
    .neq('id', 0) // 모든 레코드 삭제
  
  if (error) {
    console.error('❌ test_results 삭제 실패:', error.message)
    return false
  }
  
  console.log('✅ test_results 삭제 완료')
  return true
}

async function listAllStorageFiles(path: string = ''): Promise<string[]> {
  const supabase = createServiceClient()
  const allFiles: string[] = []
  
  const { data: items, error } = await supabase.storage
    .from('student-recordings')
    .list(path, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  
  if (error) {
    console.error(`❌ 경로 ${path} 조회 실패:`, error.message)
    return []
  }
  
  if (!items) return []
  
  for (const item of items) {
    const fullPath = path ? `${path}/${item.name}` : item.name
    
    if (item.id) {
      // 파일인 경우
      allFiles.push(fullPath)
    } else {
      // 폴더인 경우 재귀적으로 탐색
      const subFiles = await listAllStorageFiles(fullPath)
      allFiles.push(...subFiles)
    }
  }
  
  return allFiles
}

async function deleteAllStorageFiles() {
  const supabase = createServiceClient()
  console.log('🗑️  Storage 파일 목록 조회 중...')
  
  const allFiles = await listAllStorageFiles()
  console.log(`📦 발견된 파일 수: ${allFiles.length}개`)
  
  if (allFiles.length === 0) {
    console.log('✅ 삭제할 파일이 없습니다.')
    return true
  }
  
  // 1000개씩 나눠서 삭제 (Supabase 제한)
  const batchSize = 1000
  let deletedCount = 0
  
  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize)
    console.log(`🗑️  삭제 중... [${i + 1}-${Math.min(i + batchSize, allFiles.length)}/${allFiles.length}]`)
    
    const { error } = await supabase.storage
      .from('student-recordings')
      .remove(batch)
    
    if (error) {
      console.error(`❌ 배치 삭제 실패:`, error.message)
      return false
    }
    
    deletedCount += batch.length
  }
  
  console.log(`✅ Storage 파일 삭제 완료: ${deletedCount}개`)
  return true
}

async function verifyDeletion() {
  const supabase = createServiceClient()
  console.log('\n🔍 삭제 결과 확인 중...')
  
  // test_results 확인
  const { count: testResultsCount } = await supabase
    .from('test_results')
    .select('*', { count: 'exact', head: true })
  
  console.log(`   test_results: ${testResultsCount || 0}개`)
  
  // storage 확인
  const allFiles = await listAllStorageFiles()
  console.log(`   storage 파일: ${allFiles.length}개`)
  
  if ((testResultsCount || 0) === 0 && allFiles.length === 0) {
    console.log('\n✅ 모든 데이터가 성공적으로 삭제되었습니다!')
    return true
  } else {
    console.log('\n⚠️  일부 데이터가 남아있습니다.')
    return false
  }
}

async function main() {
  console.log('🧹 AIEEBSS 프로젝트 데이터 삭제 시작...\n')
  
  // 환경변수 체크
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요')
  }
  
  try {
    // 1. test_results 삭제
    const testResultsDeleted = await deleteAllTestResults()
    if (!testResultsDeleted) {
      console.error('test_results 삭제 실패')
      process.exit(1)
    }
    
    console.log()
    
    // 2. storage 파일 삭제
    const storageDeleted = await deleteAllStorageFiles()
    if (!storageDeleted) {
      console.error('storage 파일 삭제 실패')
      process.exit(1)
    }
    
    console.log()
    
    // 3. 삭제 결과 확인
    await verifyDeletion()
    
    console.log('\n🎉 작업 완료!')
  } catch (error) {
    console.error('❌ 실행 오류:', error)
    process.exit(1)
  }
}

main()


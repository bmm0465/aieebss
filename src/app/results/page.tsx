import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Database } from '@/types/supabase';

// Supabase codegen을 사용한다고 가정하고 타입을 정의합니다.
// 만약 사용하지 않는다면, 이 부분을 삭제하고 results 타입을 any[]로 사용해야 합니다.
type TestResult = Database['public']['Tables']['test_results']['Row'];



export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/');

  const { data: results, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error("결과 조회 에러:", error);
    return <div>결과를 불러오는 중 에러가 발생했습니다.</div>;
  }

  if (!results || results.length === 0) {
    return (
        <div style={{ backgroundImage: `url('/background.jpg')`, backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
            <div style={{textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: '2rem', borderRadius: '15px'}}>
                <h1>아직 치른 시험이 없습니다</h1>
                <p>시험을 먼저 완료하고 다시 확인해주세요.</p>
                <a href="/lobby" style={{color: '#FFD700', textDecoration: 'none'}}>로비로 돌아가기</a>
            </div>
        </div>
    );
  }

  // 세션 목록 페이지로 리다이렉트
  redirect('/results/sessions');
}
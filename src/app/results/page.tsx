import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';



export default async function ResultsPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error("사용자 인증 에러:", userError);
    redirect('/');
  }
  
  if (!user) {
    console.log("사용자가 인증되지 않았습니다. 로그인 페이지로 리다이렉트합니다.");
    redirect('/');
  }

  const { data: results, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error("결과 조회 에러:", error);
    return (
      <div style={{ backgroundColor: '#ffffff', backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#171717' }}>
        <div style={{textAlign: 'center', backgroundColor: '#ffffff', padding: '2rem', borderRadius: '15px', border: '1px solid rgba(0, 0, 0, 0.1)'}}>
          <h1>데이터베이스 연결 오류</h1>
          <p>결과를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <a href="/lobby" style={{color: '#FFD700', textDecoration: 'none'}}>로비로 돌아가기</a>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
        <div style={{ backgroundColor: '#ffffff', backgroundSize: 'cover', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#171717' }}>
            <div style={{textAlign: 'center', backgroundColor: '#ffffff', padding: '2rem', borderRadius: '15px', border: '1px solid rgba(0, 0, 0, 0.1)'}}>
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
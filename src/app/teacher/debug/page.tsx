import { createClient } from '@/lib/supabase/server';

export default async function DebugPage() {
  const supabase = await createClient();

  // 인증 상태 확인
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // 프로필 확인
  let profile = null;
  let profileError = null;
  if (user) {
    const result = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = result.data;
    profileError = result.error;
  }

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'monospace',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#4ec9b0' }}>🔍 인증 디버그 페이지</h1>
      
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>getUser() 결과:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            hasUser: !!user,
            userId: user?.id,
            email: user?.email,
            error: userError?.message
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>getSession() 결과:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            hasSession: !!session,
            userId: session?.user?.id,
            email: session?.user?.email,
            error: sessionError?.message
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>프로필 정보:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            hasProfile: !!profile,
            profile: profile,
            error: profileError?.message
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ color: '#569cd6' }}>환경 변수 확인:</h2>
        <pre style={{ 
          backgroundColor: '#252526', 
          padding: '1rem', 
          borderRadius: '5px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
          }, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#264f78', borderRadius: '5px' }}>
        <p style={{ margin: 0 }}>
          💡 <strong>사용법:</strong> 교사 계정으로 로그인한 후 이 페이지에 접속하여 인증 상태를 확인하세요.
        </p>
        <p style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          URL: <code>/teacher/debug</code>
        </p>
      </div>
    </div>
  );
}


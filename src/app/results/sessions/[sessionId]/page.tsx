interface PageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  console.log("SessionDetailPage - sessionId:", sessionId);
  console.log("SessionDetailPage - 페이지가 로드되었습니다!");

  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh', 
      padding: '2rem',
      color: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        padding: '3rem', 
        borderRadius: '15px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
          🎉 테스트 성공!
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          세션 상세 페이지가 정상적으로 로드되었습니다.
        </p>
        <p style={{ fontSize: '1rem', marginBottom: '2rem', opacity: 0.8 }}>
          Session ID: {sessionId}
        </p>
        <div style={{ 
          backgroundColor: 'rgba(255,215,0,0.2)',
          padding: '1rem',
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <p style={{ fontSize: '0.9rem', color: '#FFD700' }}>
            이제 세션 체크 없이 페이지가 로드되는 것을 확인했습니다.
          </p>
        </div>
        <a 
          href="/lobby" 
          style={{
            display: 'inline-block',
            backgroundColor: 'rgba(255,215,0,0.2)',
            color: '#FFD700',
            padding: '1rem 2rem',
            borderRadius: '25px',
            textDecoration: 'none',
            border: '2px solid rgba(255,215,0,0.5)',
            transition: 'all 0.3s ease',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          🏠 로비로 돌아가기
        </a>
      </div>
    </div>
  );
}

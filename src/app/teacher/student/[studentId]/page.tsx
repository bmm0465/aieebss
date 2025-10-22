import Link from 'next/link';

interface Props {
  params: Promise<{ studentId: string }>;
}

export default async function StudentDetailPage({ params }: Props) {
  console.log('[StudentDetail] 🚀 PAGE STARTED - NO AUTH CHECK');
  
  const { studentId } = await params;
  console.log('[StudentDetail] 🔍 StudentId:', studentId);

  // 인증 체크 없이 즉시 반환
  return (
    <div style={{ 
      backgroundImage: `url('/background.jpg')`, 
      backgroundSize: 'cover', 
      minHeight: '100vh',
      padding: '2rem',
      color: 'white'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#FFD700' }}>🔧 디버그 모드 - 인증 없음</h1>
        <p>StudentId: {studentId}</p>
        <p>이 페이지가 보인다면 라우팅과 렌더링은 정상입니다.</p>
        <p>인증 체크를 제거했습니다.</p>
        
        <div style={{ marginTop: '2rem' }}>
          <Link 
            href="/teacher/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255,215,0,0.2)',
              color: '#FFD700',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              textDecoration: 'none',
              border: '2px solid rgba(255,215,0,0.5)',
              fontWeight: 'bold'
            }}
          >
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
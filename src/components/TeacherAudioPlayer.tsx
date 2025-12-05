'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TeacherAudioPlayerProps {
  audioPath: string | null | undefined;
  userId?: string;
  testType?: string;
  createdAt?: string;
}

export function TeacherAudioPlayer({ 
  audioPath, 
  userId, 
  testType, 
  createdAt 
}: TeacherAudioPlayerProps) {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioPath) {
      return;
    }

    const loadAudioUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        
        // Signed URL 생성 시도
        const { data: signedData, error: signedError } = await supabase.storage
          .from('student-recordings')
          .createSignedUrl(audioPath, 3600);

        if (!signedError && signedData?.signedUrl) {
          setAudioUrl(signedData.signedUrl);
          setLoading(false);
          return;
        }

        // Public URL 시도
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (supabaseUrl) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/student-recordings/${audioPath}`;
          const response = await fetch(publicUrl, { method: 'HEAD' });
          if (response.ok) {
            setAudioUrl(publicUrl);
            setLoading(false);
            return;
          }
        }

        setError('음성 파일을 찾을 수 없습니다');
        setLoading(false);
      } catch (err) {
        console.error('[TeacherAudioPlayer] 오디오 로드 실패:', err);
        setError('오디오 로드 실패');
        setLoading(false);
      }
    };

    loadAudioUrl();
  }, [audioPath, userId, testType, createdAt]);

  if (!audioPath) {
    return <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>-</span>;
  }

  if (loading) {
    return <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>로딩 중...</span>;
  }

  if (error || !audioUrl) {
    return (
      <span style={{ color: '#dc3545', fontSize: '0.875rem' }} title={error || '재생 불가'}>
        ❌ 재생 불가
      </span>
    );
  }

  return (
    <audio 
      controls 
      style={{ width: '180px', height: '36px' }}
      onError={() => setError('재생 오류')}
    >
      <source src={audioUrl} type="audio/webm" />
      브라우저가 오디오 재생을 지원하지 않습니다.
    </audio>
  );
}


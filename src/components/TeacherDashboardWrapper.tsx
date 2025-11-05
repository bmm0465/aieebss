'use client'

import React, { useState, useEffect } from 'react';
import { SkeletonPage } from './LoadingSkeleton';
import { useToastHelpers } from './Toast';

interface TeacherDashboardWrapperProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export default function TeacherDashboardWrapper({ 
  children, 
  isLoading = false 
}: TeacherDashboardWrapperProps) {
  const [isClientLoading, setIsClientLoading] = useState(true);
  const { success } = useToastHelpers();

  useEffect(() => {
    // 클라이언트 사이드 로딩 완료
    const timer = setTimeout(() => {
      setIsClientLoading(false);
      success('교사 대시보드가 로드되었습니다', '학생들의 평가 결과를 확인할 수 있습니다.');
    }, 1000);

    return () => clearTimeout(timer);
  }, [success]);

  if (isLoading || isClientLoading) {
    return (
      <div style={{ 
        backgroundColor: '#ffffff', 
        backgroundSize: 'cover', 
        minHeight: '100vh',
        padding: '2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <SkeletonPage />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

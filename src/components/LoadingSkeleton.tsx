'use client'

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  children?: React.ReactNode;
}

// 기본 스켈레톤 박스
export function SkeletonBox({ 
  width = '100%', 
  height = '20px', 
  className = '' 
}: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gray-300 rounded ${className}`}
      style={{ width, height }}
    />
  );
}

// 텍스트 스켈레톤
export function SkeletonText({ 
  lines = 1, 
  className = '' 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox 
          key={i}
          height="16px" 
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  );
}

// 카드 스켈레톤
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-lg border p-4 ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-300 rounded"></div>
        <div className="h-3 bg-gray-300 rounded w-5/6"></div>
      </div>
    </div>
  );
}

// 테이블 스켈레톤
export function SkeletonTable({ 
  rows = 5, 
  columns = 4,
  className = '' 
}: { 
  rows?: number; 
  columns?: number; 
  className?: string; 
}) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="flex space-x-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded flex-1"></div>
            ))}
          </div>
        </div>
        {/* 행들 */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3 border-b last:border-b-0">
            <div className="flex space-x-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="h-4 bg-gray-300 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 차트 스켈레톤
export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white rounded-lg border p-6 ${className}`}>
      <div className="h-6 bg-gray-300 rounded w-1/3 mb-4"></div>
      <div className="h-64 bg-gray-100 rounded flex items-end justify-between px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i}
            className="bg-gray-300 rounded-t"
            style={{ 
              height: `${Math.random() * 60 + 20}%`,
              width: '12%'
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 bg-gray-300 rounded w-8"></div>
        ))}
      </div>
    </div>
  );
}

// 버튼 스켈레톤
export function SkeletonButton({ 
  width = '120px', 
  height = '40px',
  className = '' 
}: { 
  width?: string | number; 
  height?: string | number; 
  className?: string; 
}) {
  return (
    <div 
      className={`animate-pulse bg-gray-300 rounded ${className}`}
      style={{ width, height }}
    />
  );
}

// 전체 페이지 스켈레톤
export function SkeletonPage({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-6 ${className}`}>
      {/* 헤더 */}
      <div className="bg-white rounded-lg border p-6">
        <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
      
      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      
      {/* 테이블 */}
      <SkeletonTable />
    </div>
  );
}

export default {
  Box: SkeletonBox,
  Text: SkeletonText,
  Card: SkeletonCard,
  Table: SkeletonTable,
  Chart: SkeletonChart,
  Button: SkeletonButton,
  Page: SkeletonPage
};

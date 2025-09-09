// src/app/results/page.tsx (Server Component)

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ResultReport from '@/components/ResultReport'; // UI는 클라이언트 컴포넌트에 위임
import { redirect } from 'next/navigation';

// 모든 시험 결과를 계산하고 정리하는 함수
const calculateResults = (results: any[]) => {
  const summary = {
    LNF: { correct: 0, total: 0, accuracy: 0 },
    PSF: { correct: 0, total: 0, accuracy: 0 },
    NWF: { phonemes_correct: 0, whole_word_correct: 0, total: 0, phoneme_accuracy: 0, whole_word_accuracy: 0 },
    WRF: { correct: 0, total: 0, accuracy: 0 },
    ORF: { total_wcpm: 0, total_accuracy: 0, count: 0, avg_wcpm: 0, avg_accuracy: 0 },
    MAZE: { correct: 0, total: 0, accuracy: 0 },
  };

  results.forEach(res => {
    switch (res.test_type) {
      case 'LNF':
      case 'PSF':
      case 'WRF':
      case 'MAZE':
        summary[res.test_type].total++;
        if (res.is_correct) summary[res.test_type].correct++;
        break;
      case 'NWF':
        summary.NWF.total++;
        if (res.is_phonemes_correct) summary.NWF.phonemes_correct++;
        if (res.is_whole_word_correct) summary.NWF.whole_word_correct++;
        break;
      case 'ORF':
        summary.ORF.count++;
        summary.ORF.total_wcpm += res.wcpm || 0;
        summary.ORF.total_accuracy += res.accuracy || 0;
        break;
    }
  });

  // 정확도 계산
  ['LNF', 'PSF', 'WRF', 'MAZE'].forEach(type => {
    const test = summary[type as keyof typeof summary] as any;
    if (test.total > 0) test.accuracy = (test.correct / test.total) * 100;
  });

  if (summary.NWF.total > 0) {
    summary.NWF.phoneme_accuracy = (summary.NWF.phonemes_correct / summary.NWF.total) * 100;
    summary.NWF.whole_word_accuracy = (summary.NWF.whole_word_correct / summary.NWF.total) * 100;
  }

  if (summary.ORF.count > 0) {
    summary.ORF.avg_wcpm = summary.ORF.total_wcpm / summary.ORF.count;
    summary.ORF.avg_accuracy = (summary.ORF.total_accuracy / summary.ORF.count) * 100;
  }

  return summary;
};


export default async function ResultsPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/'); // 로그인하지 않았다면 로그인 페이지로
  }

  // RLS 정책 덕분에, 이 쿼리는 자동으로 현재 로그인한 사용자의 결과만 가져옴
  const { data: results, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('user_id', session.user.id);

  if (error) {
    console.error("결과 조회 에러:", error);
    // TODO: 에러 페이지 UI 표시
    return <div>결과를 불러오는 중 에러가 발생했습니다.</div>;
  }

  if (!results || results.length === 0) {
    // TODO: 시험을 아직 치르지 않았다는 안내 페이지 UI 표시
    return <div>아직 치른 시험이 없습니다.</div>;
  }

  // 서버에서 모든 계산을 끝냄
  const processedResults = calculateResults(results);

  // 계산된 결과를 UI 컴포넌트로 전달
  return (
      <ResultReport results={processedResults} />
  );
}
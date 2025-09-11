import { createClient } from '@/lib/supabase/server';
import ResultReport from '@/components/ResultReport';
import { redirect } from 'next/navigation';
import type { Database } from '@/types/supabase';

// Supabase codegen을 사용한다고 가정하고 타입을 정의합니다.
// 만약 사용하지 않는다면, 이 부분을 삭제하고 results 타입을 any[]로 사용해야 합니다.
type TestResult = Database['public']['Tables']['test_results']['Row'];

// UI 컴포넌트가 받을 데이터의 타입을 명확하게 export합니다.
export interface ProcessedResults {
  LNF: { correct: number; total: number; accuracy: number };
  PSF: { correct_segments: number; target_segments: number; accuracy: number; total: number };
  NWF: { phonemes_correct: number; whole_word_correct: number; total: number; phoneme_accuracy: number; whole_word_accuracy: number };
  WRF: { correct: number; total: number; accuracy: number };
  ORF: { total_wcpm: number; total_accuracy: number; count: number; avg_wcpm: number; avg_accuracy: number };
  MAZE: { correct: number; total: number; accuracy: number; score: number };
}

const calculateResults = (results: TestResult[]): ProcessedResults => {
  const summary: ProcessedResults = {
    LNF: { correct: 0, total: 0, accuracy: 0 },
    PSF: { correct_segments: 0, target_segments: 0, accuracy: 0, total: 0 },
    NWF: { phonemes_correct: 0, whole_word_correct: 0, total: 0, phoneme_accuracy: 0, whole_word_accuracy: 0 },
    WRF: { correct: 0, total: 0, accuracy: 0 },
    ORF: { total_wcpm: 0, total_accuracy: 0, count: 0, avg_wcpm: 0, avg_accuracy: 0 },
    MAZE: { correct: 0, total: 0, accuracy: 0, score: 0 },
  };

  // [핵심 수정] switch 문을 if-else if 구조로 변경하여 타입 추론을 명확하게 함
  results.forEach(res => {
    if (res.test_type === 'LNF') {
      summary.LNF.total++;
      if (res.is_correct) summary.LNF.correct++;
    } else if (res.test_type === 'PSF') {
      summary.PSF.total++;
      summary.PSF.correct_segments += res.correct_segments || 0;
      summary.PSF.target_segments += res.target_segments || 0;
    } else if (res.test_type === 'NWF') {
      summary.NWF.total++;
      if (res.is_phonemes_correct) summary.NWF.phonemes_correct++;
      if (res.is_whole_word_correct) summary.NWF.whole_word_correct++;
    } else if (res.test_type === 'WRF') {
      summary.WRF.total++;
      if (res.is_correct) summary.WRF.correct++;
    } else if (res.test_type === 'ORF') {
      summary.ORF.count++;
      summary.ORF.total_wcpm += res.wcpm || 0;
      summary.ORF.total_accuracy += res.accuracy || 0;
    } else if (res.test_type === 'MAZE') {
      summary.MAZE.total++;
      if (res.is_correct) summary.MAZE.correct++;
    }
  });

  // 정확도 및 점수 계산 (이 부분은 타입 에러와 무관하지만 유지)
  if (summary.LNF.total > 0) summary.LNF.accuracy = (summary.LNF.correct / summary.LNF.total) * 100;
  if (summary.PSF.target_segments > 0) summary.PSF.accuracy = (summary.PSF.correct_segments / summary.PSF.target_segments) * 100;
  if (summary.NWF.total > 0) {
    summary.NWF.phoneme_accuracy = (summary.NWF.phonemes_correct / summary.NWF.total) * 100;
    summary.NWF.whole_word_accuracy = (summary.NWF.whole_word_correct / summary.NWF.total) * 100;
  }
  if (summary.WRF.total > 0) summary.WRF.accuracy = (summary.WRF.correct / summary.WRF.total) * 100;
  if (summary.ORF.count > 0) {
    summary.ORF.avg_wcpm = summary.ORF.total_wcpm / summary.ORF.count;
    summary.ORF.avg_accuracy = (summary.ORF.total_accuracy / summary.ORF.count) * 100;
  }
  if (summary.MAZE.total > 0) {
    const incorrect = summary.MAZE.total - summary.MAZE.correct;
    summary.MAZE.score = summary.MAZE.correct - (incorrect / 2);
    summary.MAZE.accuracy = (summary.MAZE.correct / summary.MAZE.total) * 100;
  }

  return summary;
};


export default async function ResultsPage() {
  const supabase = createClient();

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
            </div>
        </div>
    );
  }

  const processedResults = calculateResults(results);

  return (
      <ResultReport results={processedResults} />
  );
}
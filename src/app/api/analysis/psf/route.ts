import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PSF 분석 API
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const analysisType = searchParams.get('type'); // 'difficult-words', 'student-weak', 'class-summary'
    const studentId = searchParams.get('studentId');
    const className = searchParams.get('className');

    // 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    // 교사 권한 확인
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: '교사 권한이 필요합니다.' }, { status: 403 });
    }

    // 분석 유형에 따른 처리
    switch (analysisType) {
      case 'difficult-words':
        return await getDifficultWords(supabase);
      
      case 'student-weak':
        if (!studentId) {
          return NextResponse.json({ error: 'studentId가 필요합니다.' }, { status: 400 });
        }
        return await getStudentWeakWords(supabase, studentId);
      
      case 'class-summary':
        if (!className) {
          return NextResponse.json({ error: 'className이 필요합니다.' }, { status: 400 });
        }
        return await getClassSummary(supabase, className);
      
      default:
        return NextResponse.json({ error: '올바른 분석 유형을 지정하세요.' }, { status: 400 });
    }
  } catch (error) {
    console.error('PSF 분석 에러:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

// 전체 어려운 단어 목록
async function getDifficultWords(supabase: any) {
  const { data, error } = await supabase.rpc('get_psf_difficult_words');
  
  if (error) {
    // RPC 함수가 없으면 직접 쿼리
    const { data: results, error: queryError } = await supabase
      .from('test_results')
      .select('question_word, correct_segments, target_segments')
      .eq('test_type', 'PSF');

    if (queryError) throw queryError;

    // 단어별 정답률 계산
    const wordStats: { [key: string]: { total: number; correctSum: number; targetSum: number } } = {};
    
    results?.forEach((r: any) => {
      if (!wordStats[r.question_word]) {
        wordStats[r.question_word] = { total: 0, correctSum: 0, targetSum: 0 };
      }
      wordStats[r.question_word].total++;
      wordStats[r.question_word].correctSum += r.correct_segments || 0;
      wordStats[r.question_word].targetSum += r.target_segments || 0;
    });

    const difficultWords = Object.entries(wordStats)
      .map(([word, stats]) => ({
        word,
        attempts: stats.total,
        accuracy: stats.targetSum > 0 ? (stats.correctSum / stats.targetSum) * 100 : 0,
        phonemeCount: Math.round(stats.targetSum / stats.total)
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 20);

    return NextResponse.json({ difficultWords });
  }

  return NextResponse.json({ difficultWords: data });
}

// 특정 학생의 약점 단어
async function getStudentWeakWords(supabase: any, studentId: string) {
  const { data: results, error } = await supabase
    .from('test_results')
    .select('question_word, correct_segments, target_segments')
    .eq('test_type', 'PSF')
    .eq('user_id', studentId);

  if (error) throw error;

  // 단어별 통계
  const wordStats: { [key: string]: { correct: number[]; target: number[] } } = {};
  
  results?.forEach((r: any) => {
    if (!wordStats[r.question_word]) {
      wordStats[r.question_word] = { correct: [], target: [] };
    }
    wordStats[r.question_word].correct.push(r.correct_segments || 0);
    wordStats[r.question_word].target.push(r.target_segments || 0);
  });

  const weakWords = Object.entries(wordStats)
    .map(([word, stats]) => {
      const avgCorrect = stats.correct.reduce((a, b) => a + b, 0) / stats.correct.length;
      const avgTarget = stats.target.reduce((a, b) => a + b, 0) / stats.target.length;
      return {
        word,
        accuracy: avgTarget > 0 ? (avgCorrect / avgTarget) * 100 : 0,
        attempts: stats.correct.length,
        avgMissedPhonemes: avgTarget - avgCorrect
      };
    })
    .filter(w => w.accuracy < 80)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 15);

  return NextResponse.json({ weakWords });
}

// 반 전체 요약
async function getClassSummary(supabase: any, className: string) {
  const { data: results, error } = await supabase
    .from('test_results')
    .select(`
      question_word,
      correct_segments,
      target_segments,
      user_profiles!inner (
        class_name
      )
    `)
    .eq('test_type', 'PSF')
    .eq('user_profiles.class_name', className);

  if (error) throw error;

  // 단어별 반 평균 계산
  const wordStats: { [key: string]: { correctSum: number; targetSum: number; count: number } } = {};
  
  results?.forEach((r: any) => {
    if (!wordStats[r.question_word]) {
      wordStats[r.question_word] = { correctSum: 0, targetSum: 0, count: 0 };
    }
    wordStats[r.question_word].correctSum += r.correct_segments || 0;
    wordStats[r.question_word].targetSum += r.target_segments || 0;
    wordStats[r.question_word].count++;
  });

  const classWeakWords = Object.entries(wordStats)
    .map(([word, stats]) => ({
      word,
      accuracy: stats.targetSum > 0 ? (stats.correctSum / stats.targetSum) * 100 : 0,
      studentCount: stats.count,
      phonemeCount: Math.round(stats.targetSum / stats.count)
    }))
    .filter(w => w.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 15);

  return NextResponse.json({ 
    className,
    weakWords: classWeakWords,
    totalWords: Object.keys(wordStats).length
  });
}


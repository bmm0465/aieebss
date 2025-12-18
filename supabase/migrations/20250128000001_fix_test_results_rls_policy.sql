-- test_results 테이블의 RLS 정책 명시적으로 재생성
-- 교사가 담당 학생의 결과를 볼 수 있도록 보장

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Teachers can view their students' results" ON test_results;

-- 교사는 담당 학생의 test_results를 볼 수 있음 (명시적으로 재생성)
CREATE POLICY "Teachers can view their students' results"
  ON test_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teacher_student_assignments
      WHERE teacher_id = auth.uid() AND student_id = test_results.user_id
    )
  );

-- 정책이 제대로 생성되었는지 확인을 위한 주석
COMMENT ON POLICY "Teachers can view their students' results" ON test_results IS 
  '교사는 teacher_student_assignments 테이블에 배정된 학생들의 테스트 결과를 조회할 수 있습니다.';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    
    console.log('🔍 API: Student data request for:', studentId);
    
    const supabase = await createClient();
    const serviceSupabase = createServiceClient();
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ API: Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ API: Auth success for user:', user.email);
    
    // 교사 권한 확인 (서비스 역할로 RLS 우회)
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'teacher') {
      console.log('❌ API: Not a teacher');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log('✅ API: Teacher role confirmed');
    
    // 교사-학생 할당 관계 확인 (서비스 역할로 RLS 우회)
    const { data: assignment } = await serviceSupabase
      .from('teacher_student_assignments')
      .select('*')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .single();
    
    if (!assignment) {
      console.log('❌ API: No assignment found');
      return NextResponse.json({ error: 'Student not assigned' }, { status: 403 });
    }
    
    console.log('✅ API: Assignment confirmed');
    
    // 학생 프로필 정보 (서비스 역할로 RLS 우회)
    const { data: student } = await serviceSupabase
      .from('user_profiles')
      .select('*')
      .eq('id', studentId)
      .single();
    
    if (!student) {
      console.log('❌ API: Student not found');
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    
    console.log('✅ API: Student profile found:', student.full_name);
    
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        full_name: student.full_name,
        class_name: assignment.class_name
      },
      message: 'Student data retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ API: Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

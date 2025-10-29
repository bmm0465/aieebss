import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const { studentId } = await params
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Ensure requester is a teacher
    const { data: profile } = await service
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify teacher-student assignment
    const { data: assignment } = await service
      .from('teacher_student_assignments')
      .select('class_name')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Not assigned' }, { status: 403 })
    }

    // Student profile
    const { data: student } = await service
      .from('user_profiles')
      .select('id, full_name, class_name, grade_level, student_number')
      .eq('id', studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Results
    const { data: results } = await service
      .from('test_results')
      .select('id, test_type, question, student_answer, is_correct, created_at')
      .eq('user_id', studentId)
      .order('created_at', { ascending: false })

    // Build simple stats
    const stats: Record<string, { total: number, correct: number, accuracy: number }> = {}
    for (const r of results || []) {
      const key = r.test_type || 'UNKNOWN'
      if (!stats[key]) stats[key] = { total: 0, correct: 0, accuracy: 0 }
      stats[key].total += 1
      if (r.is_correct) stats[key].correct += 1
    }
    for (const key of Object.keys(stats)) {
      const s = stats[key]
      s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
    }

    return NextResponse.json({
      student,
      assignment,
      results: results || [],
      stats,
    })
  } catch (e) {
    console.error('Teacher fetch results error:', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

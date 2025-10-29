import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Admin 권한 확인 (이메일로 직접 확인)
    if (user.email !== 'admin@abs.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // 서비스 역할 클라이언트로 RLS 우회하여 데이터 가져오기
    const serviceSupabase = createServiceClient();
    const { data, error } = await serviceSupabase
      .from('test_results')
      .select('*')
      .eq('test_type', 'LNF')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error loading LNF results:', error);
      return NextResponse.json({ error: 'Failed to load results' }, { status: 500 });
    }
    
    return NextResponse.json({ results: data || [] });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

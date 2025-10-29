import { createClient } from '@/lib/supabase/client';
import { createServiceClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    // Admin 계정을 이메일로 직접 확인 (더 간단하고 확실함)
    return user.email === 'admin@abs.com';
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

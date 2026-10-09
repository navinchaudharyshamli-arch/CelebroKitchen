import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Server database configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify staff profile role
    let { data: profile } = await supabase
      .from('staff_profiles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    // Auto-provision initial admin if staff_profiles has 0 rows or missing
    if (!profile) {
      const { count } = await supabase
        .from('staff_profiles')
        .select('*', { count: 'exact', head: true });

      if (count === 0 || count === null) {
        await supabase.from('staff_profiles').insert({
          user_id: data.user.id,
          role: 'admin',
          display_name: 'Mess Owner',
        });
        profile = { role: 'admin' };
      }
    }

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized staff role' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: profile.role,
    });

    // Set auth token cookie
    response.cookies.set('admin_session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Server authentication error' },
      { status: 500 }
    );
  }
}

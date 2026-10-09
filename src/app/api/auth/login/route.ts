import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { memberCode, pin } = await request.json();

    const supabaseUrl = process.env.SUPABASE_URL || 'https://oxvthtlcsrnnunwrvtth.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find member by member_code or phone
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .or(`member_code.eq.${memberCode},phone.eq.${memberCode}`)
      .single();

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Invalid Member ID or PIN' },
        { status: 401 }
      );
    }

    // For demo convenience, allow default PIN '12345' or matched PIN
    const isValidPin = pin === '12345' || (member.pin_hash && member.pin_hash === pin);

    if (!isValidPin) {
      return NextResponse.json(
        { success: false, error: 'Invalid Member ID or PIN' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      mustChangePin: member.must_change_pin,
    });

    // Set member session cookie
    response.cookies.set('session_token', member.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication error' },
      { status: 500 }
    );
  }
}

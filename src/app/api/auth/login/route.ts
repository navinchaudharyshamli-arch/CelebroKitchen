import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { memberCode, pin } = await request.json();

    const supabaseUrl = process.env.SUPABASE_URL || 'https://oxvthtlcsrnnunwrvtth.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Case-insensitive lookup for member code or phone
    let { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .or(`member_code.ilike.${memberCode},phone.eq.${memberCode}`)
      .maybeSingle();

    // Auto-create demo student if testing with CK-0001 to CK-0030
    if ((!member || memberError) && /^ck-\d{4}$/i.test(memberCode)) {
      const formattedCode = memberCode.toUpperCase();
      const { data: newMember } = await supabase
        .from('members')
        .insert({
          member_code: formattedCode,
          full_name: `Demo Student ${formattedCode}`,
          email: `${formattedCode.toLowerCase()}@example.com`,
          phone: `98765${formattedCode.replace('CK-', '')}`,
          status: 'active',
          must_change_pin: false,
        })
        .select()
        .maybeSingle();

      member = newMember;
    }

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

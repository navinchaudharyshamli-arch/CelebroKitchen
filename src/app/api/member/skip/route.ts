import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { memberId, entryDate, mealId, idempotencyKey } = await request.json();

    const supabaseUrl = process.env.SUPABASE_URL || 'https://oxvthtlcsrnnunwrvtth.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.rpc('skip_meal_atomic', {
      p_member_id: memberId,
      p_entry_date: entryDate,
      p_meal_id: mealId,
      p_idempotency_key: idempotencyKey || `skip:${memberId}:${entryDate}:${mealId}`,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

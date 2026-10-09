import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://oxvthtlcsrnnunwrvtth.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const todayStr = new Date().toISOString().split('T')[0];

    // Active members
    const { count: activeMembers } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Away on holiday today
    const { count: awayOnHoliday } = await supabase
      .from('holidays')
      .select('*', { count: 'exact', head: true })
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)
      .is('cancelled_at', null);

    // Members with positive credits
    const { data: ledgerRows } = await supabase.from('credit_ledger').select('member_id, delta');
    const creditBalances: Record<string, number> = {};
    (ledgerRows || []).forEach((row) => {
      creditBalances[row.member_id] = (creditBalances[row.member_id] || 0) + row.delta;
    });
    const membersWithCredits = Object.values(creditBalances).filter((b) => b > 0).length;

    // Headcounts per meal today
    const { data: meals } = await supabase.from('meals').select('id, code').order('sort_order');
    const mealStats: Record<string, { expected: number; skipped: number; extra: number; netComing: number }> = {
      breakfast: { expected: 0, skipped: 0, extra: 0, netComing: 0 },
      lunch: { expected: 0, skipped: 0, extra: 0, netComing: 0 },
      dinner: { expected: 0, skipped: 0, extra: 0, netComing: 0 },
    };

    if (meals) {
      for (const meal of meals) {
        const { data: entries } = await supabase
          .from('meal_entries')
          .select('status, is_extra')
          .eq('entry_date', todayStr)
          .eq('meal_id', meal.id);

        let exp = 0;
        let skip = 0;
        let ext = 0;

        (entries || []).forEach((e) => {
          if (e.status === 'expected' && !e.is_extra) exp++;
          if (e.status === 'skipped') skip++;
          if (e.status === 'expected' && e.is_extra) ext++;
        });

        mealStats[meal.code] = {
          expected: exp,
          skipped: skip,
          extra: ext,
          netComing: exp + ext,
        };
      }
    }

    return NextResponse.json({
      activeMembers: activeMembers || 0,
      awayOnHoliday: awayOnHoliday || 0,
      membersWithCredits,
      outstandingDues: 0,
      breakfast: mealStats.breakfast || { expected: 0, skipped: 0, extra: 0, netComing: 0 },
      lunch: mealStats.lunch || { expected: 0, skipped: 0, extra: 0, netComing: 0 },
      dinner: mealStats.dinner || { expected: 0, skipped: 0, extra: 0, netComing: 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

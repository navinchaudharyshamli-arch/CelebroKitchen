import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    if (process.env.ALLOW_DEMO !== 'true') {
      return NextResponse.json(
        { success: false, error: 'Demo seeding is disabled in production' },
        { status: 403 }
      );
    }
    const { seedDemoData } = await import('@/lib/db/seed-demo');
    const res = await seedDemoData();
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

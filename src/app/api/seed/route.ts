import { NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/db/seed-demo';

export async function POST() {
  try {
    const res = await seedDemoData();
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';

export async function seedDemoData() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://oxvthtlcsrnnunwrvtth.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';
  const supabase = createClient(supabaseUrl, supabaseKey);
  // 1. Get Meals
  const { data: meals } = await supabase.from('meals').select('*').order('sort_order');
  if (!meals || meals.length === 0) return { success: false, error: 'No meals found. Please run seed.sql first.' };

  const bId = meals.find((m) => m.code === 'breakfast')?.id || meals[0].id;
  const lId = meals.find((m) => m.code === 'lunch')?.id || meals[1]?.id || meals[0].id;
  const dId = meals.find((m) => m.code === 'dinner')?.id || meals[2]?.id || meals[0].id;

  // 2. Generate 30 Members
  const sampleNames = [
    'Aarav Sharma', 'Vivaan Patel', 'Aditya Verma', 'Vihaan Gupta', 'Arjun Singh',
    'Sai Kumar', 'Reyansh Joshi', 'Ayaan Khan', 'Krishna Nair', 'Ishaan Reddy',
    'Ananya Sen', 'Diya Mehta', 'Saanvi Rao', 'Aadhya Bhat', 'Priya Roy',
    'Kavya Malhotra', 'Anika Choudhury', 'Navya Mishra', 'Riya Kapoor', 'Sara Agarwal',
    'Rohan Saxena', 'Karan Pillai', 'Dev Shah', 'Kabir Das', 'Yash Trivedi',
    'Meera Pandey', 'Tanvi Deshmukh', 'Pooja Iyer', 'Nisha Yadav', 'Neha Bose'
  ];

  const createdMembers = [];

  for (let i = 0; i < 30; i++) {
    const code = `CK-${(i + 1).toString().padStart(4, '0')}`;
    const name = sampleNames[i];
    const email = `student${i + 1}@example.com`;
    const phone = `98765${(10000 + i).toString()}`;

    const { data: member } = await supabase
      .from('members')
      .upsert({
        member_code: code,
        full_name: name,
        email,
        phone,
        status: 'active',
        must_change_pin: false,
      }, { onConflict: 'member_code' })
      .select()
      .single();

    if (member) createdMembers.push(member);
  }

  // 3. Create active subscriptions & calendar entries for today
  const todayStr = new Date().toISOString().split('T')[0];

  for (const m of createdMembers) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .insert({
        member_id: m.id,
        plan_type: 'monthly',
        meal_ids: [bId, lId, dId],
        start_date: '2026-10-01',
        end_date: '2026-10-31',
        terms: {
          credit_scope: 'any',
          credit_policy: 'rollover',
          rollover_cap: null,
          credit_expiry_days: 30,
        },
        status: 'active',
      })
      .select()
      .single();

    if (sub) {
      // Create expected meal entries for today
      await supabase.from('meal_entries').upsert([
        { member_id: m.id, subscription_id: sub.id, entry_date: todayStr, meal_id: bId, status: 'expected' },
        { member_id: m.id, subscription_id: sub.id, entry_date: todayStr, meal_id: lId, status: 'expected' },
        { member_id: m.id, subscription_id: sub.id, entry_date: todayStr, meal_id: dId, status: 'expected' },
      ], { onConflict: 'member_id,entry_date,meal_id' });
    }
  }

  // 4. Mark 5 students as skipped for today's Lunch
  const skippingMembers = createdMembers.slice(0, 5);
  for (const m of skippingMembers) {
    const { data: entry } = await supabase
      .from('meal_entries')
      .update({ status: 'skipped', skip_count: 1, skipped_at: new Date().toISOString() })
      .eq('member_id', m.id)
      .eq('entry_date', todayStr)
      .eq('meal_id', lId)
      .select()
      .single();

    if (entry) {
      await supabase.from('credit_ledger').upsert({
        member_id: m.id,
        delta: 1,
        reason: 'skip',
        idempotency_key: `demo_skip:${entry.id}`,
        meal_entry_id: entry.id,
      }, { onConflict: 'idempotency_key' });
    }
  }

  return { success: true, member_count: createdMembers.length };
}

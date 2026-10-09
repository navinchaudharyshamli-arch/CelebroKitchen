-- Atomic Skip RPC function with Idempotency Key & DB Clock verification
create or replace function skip_meal_atomic(
  p_member_id uuid,
  p_entry_date date,
  p_meal_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_member record;
  v_meal record;
  v_sub record;
  v_entry record;
  v_cutoff_ts timestamptz;
  v_db_now timestamptz := now();
  v_existing_resp jsonb;
  v_ledger_id uuid;
begin
  -- 1. Check Idempotency Key
  select response into v_existing_resp
  from idempotency_keys
  where key = p_idempotency_key;

  if v_existing_resp is not null then
    return v_existing_resp;
  end if;

  -- 2. Lock member row
  select * into v_member
  from members
  where id = p_member_id
  for update;

  if v_member.id is null then
    raise exception 'Member not found';
  end if;

  -- 3. Lock meal
  select * into v_meal
  from meals
  where id = p_meal_id;

  -- Verify Cutoff time using DB clock
  v_cutoff_ts := (p_entry_date + v_meal.start_time - (v_meal.cutoff_minutes || ' minutes')::interval) at time zone 'Asia/Kolkata';
  if v_db_now >= v_cutoff_ts then
    return jsonb_build_object('success', false, 'error', 'Cutoff time has passed');
  end if;

  -- 4. Get active subscription
  select * into v_sub
  from subscriptions
  where member_id = p_member_id
    and status = 'active'
    and start_date <= p_entry_date
    and (end_date is null or end_date >= p_entry_date)
  limit 1;

  -- 5. Upsert meal_entry
  insert into meal_entries (member_id, subscription_id, entry_date, meal_id, status, skip_count, skipped_at)
  values (p_member_id, v_sub.id, p_entry_date, p_meal_id, 'skipped', 1, v_db_now)
  on conflict (member_id, entry_date, meal_id) do update
  set status = 'skipped',
      skip_count = meal_entries.skip_count + 1,
      skipped_at = v_db_now,
      updated_at = v_db_now
  where meal_entries.status = 'expected'
  returning * into v_entry;

  if v_entry.id is null then
    return jsonb_build_object('success', false, 'error', 'Meal entry is not in expected state or cutoff passed');
  end if;

  -- 6. Grant credit only for monthly plans
  if v_sub.plan_type = 'monthly' then
    insert into credit_ledger (member_id, delta, reason, idempotency_key, meal_entry_id)
    values (p_member_id, 1, 'skip', 'skip:' || v_entry.id || ':' || v_entry.skip_count, v_entry.id)
    on conflict (idempotency_key) do nothing;
  end if;

  -- 7. Record Idempotency Key response
  v_existing_resp := jsonb_build_object('success', true, 'entry_id', v_entry.id, 'status', 'skipped');
  insert into idempotency_keys (key, member_id, action, response)
  values (p_idempotency_key, p_member_id, 'skip', v_existing_resp);

  return v_existing_resp;
end;
$$;

-- Migration: 004_holidays_and_closed_days_rpc.sql

-- Atomic RPC function to request student or admin holiday
create or replace function create_holiday_atomic(
  p_member_id uuid,
  p_start_date date,
  p_end_date date,
  p_meal_ids uuid[],
  p_note text,
  p_created_by text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_holiday_id uuid;
  v_curr_date date;
  v_meal_id uuid;
  v_sub record;
  v_meal record;
  v_cutoff_ts timestamptz;
  v_db_now timestamptz := now();
  v_total_skipped int := 0;
  v_total_credits int := 0;
  v_existing_resp jsonb;
  v_entry record;
  v_target_meals uuid[];
begin
  -- 1. Check idempotency
  select response into v_existing_resp
  from idempotency_keys
  where key = p_idempotency_key;

  if v_existing_resp is not null then
    return v_existing_resp;
  end if;

  -- 2. Lock member row
  perform 1 from members where id = p_member_id for update;

  -- Get active subscription
  select * into v_sub
  from subscriptions
  where member_id = p_member_id
    and status = 'active'
    and start_date <= p_end_date
    and (end_date is null or end_date >= p_start_date)
  limit 1;

  if v_sub.id is null then
    return jsonb_build_object('success', false, 'error', 'No active subscription found for period');
  end if;

  -- Determine meals to include
  if p_meal_ids is null or array_length(p_meal_ids, 1) = 0 then
    v_target_meals := v_sub.meal_ids;
  else
    v_target_meals := p_meal_ids;
  end if;

  -- 3. Insert holiday record
  insert into holidays (member_id, start_date, end_date, meal_ids, note, created_by)
  values (p_member_id, p_start_date, p_end_date, v_target_meals, p_note, p_created_by)
  returning id into v_holiday_id;

  -- 4. Process each date and meal
  v_curr_date := p_start_date;
  while v_curr_date <= p_end_date loop
    foreach v_meal_id in array v_target_meals loop
      select * into v_meal from meals where id = v_meal_id;

      v_cutoff_ts := (v_curr_date + v_meal.start_time - (v_meal.cutoff_minutes || ' minutes')::interval) at time zone 'Asia/Kolkata';

      -- Process only if cutoff is in the future
      if v_db_now < v_cutoff_ts then
        insert into meal_entries (member_id, subscription_id, holiday_id, entry_date, meal_id, status, skip_count, skipped_at)
        values (p_member_id, v_sub.id, v_holiday_id, v_curr_date, v_meal_id, 'skipped', 1, v_db_now)
        on conflict (member_id, entry_date, meal_id) do update
        set status = 'skipped',
            holiday_id = v_holiday_id,
            skip_count = meal_entries.skip_count + 1,
            skipped_at = v_db_now,
            updated_at = v_db_now
        where meal_entries.status = 'expected'
        returning * into v_entry;

        if v_entry.id is not null then
          v_total_skipped := v_total_skipped + 1;

          if v_sub.plan_type = 'monthly' then
            insert into credit_ledger (member_id, delta, reason, idempotency_key, meal_entry_id)
            values (p_member_id, 1, 'skip', 'skip:' || v_entry.id || ':' || v_entry.skip_count, v_entry.id)
            on conflict (idempotency_key) do nothing;
            v_total_credits := v_total_credits + 1;
          end if;
        end if;
      end if;
    end loop;
    v_curr_date := v_curr_date + 1;
  end loop;

  v_existing_resp := jsonb_build_object(
    'success', true,
    'holiday_id', v_holiday_id,
    'skipped_count', v_total_skipped,
    'credits_granted', v_total_credits
  );

  insert into idempotency_keys (key, member_id, action, response)
  values (p_idempotency_key, p_member_id, 'create_holiday', v_existing_resp);

  return v_existing_resp;
end;
$$;

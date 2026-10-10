-- Migration: 007_unified_spec_logic.sql

-- 1. Helper function to check cutoff using DB clock
create or replace function is_cutoff_passed(
  p_entry_date date,
  p_start_time time,
  p_cutoff_minutes int,
  p_tz text default 'Asia/Kolkata'
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_cutoff_ts timestamptz;
begin
  v_cutoff_ts := (p_entry_date + p_start_time - (p_cutoff_minutes || ' minutes')::interval) at time zone p_tz;
  return now() >= v_cutoff_ts;
end;
$$;

-- 2. Refactored skip_meal with exact CUTOFF_PASSED error code
create or replace function skip_meal(
  p_member_id uuid,
  p_entry_date date,
  p_meal_id uuid,
  p_idempotency_key text default null
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
  v_db_now timestamptz := now();
  v_cutoff_ts timestamptz;
  v_key text;
  v_existing_resp jsonb;
  v_balance int := 0;
begin
  -- 1. Lock member row
  select * into v_member from members where id = p_member_id for update;
  if v_member.id is null then
    return jsonb_build_object('success', false, 'error', 'MEAL_NOT_FOUND');
  end if;

  -- 2. Load meal
  select * into v_meal from meals where id = p_meal_id and active = true;
  if v_meal.id is null then
    return jsonb_build_object('success', false, 'error', 'MEAL_NOT_FOUND');
  end if;

  -- 3. Cutoff check using DB clock
  v_cutoff_ts := (p_entry_date + v_meal.start_time - (v_meal.cutoff_minutes || ' minutes')::interval) at time zone 'Asia/Kolkata';
  if v_db_now >= v_cutoff_ts then
    return jsonb_build_object('success', false, 'error', 'CUTOFF_PASSED', 'message', 'Locked. The cut-off passed at ' || to_char(v_cutoff_ts, 'HH12:MI AM') || '.');
  end if;

  -- 4. Subscription check
  select * into v_sub from subscriptions
  where member_id = p_member_id and status = 'active'
    and start_date <= p_entry_date and (end_date is null or end_date >= p_entry_date)
  limit 1;

  if v_sub.id is null or not (v_meal.id = any(v_sub.meal_ids)) then
    return jsonb_build_object('success', false, 'error', 'NOT_SUBSCRIBED', 'message', 'This meal is not part of your plan. You can add it as an extra.');
  end if;

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
    -- Check if already skipped (idempotent)
    select * into v_entry from meal_entries where member_id = p_member_id and entry_date = p_entry_date and meal_id = p_meal_id;
    if v_entry.status = 'skipped' then
      select coalesce(sum(delta), 0) into v_balance from credit_ledger where member_id = p_member_id;
      return jsonb_build_object('success', true, 'status', 'skipped', 'credits_balance', v_balance);
    end if;
    return jsonb_build_object('success', false, 'error', 'INVALID_STATE');
  end if;

  -- 6. Credit ledger entry for monthly plans only
  if v_sub.plan_type = 'monthly' then
    v_key := coalesce(p_idempotency_key, 'skip:' || v_entry.id || ':' || v_entry.skip_count);
    insert into credit_ledger (member_id, delta, reason, idempotency_key, meal_entry_id)
    values (p_member_id, 1, 'skip', v_key, v_entry.id)
    on conflict (idempotency_key) do nothing;
  end if;

  select coalesce(sum(delta), 0) into v_balance from credit_ledger where member_id = p_member_id;

  return jsonb_build_object(
    'success', true,
    'status', 'skipped',
    'credits_balance', v_balance,
    'entry_id', v_entry.id
  );
end;
$$;

-- 3. Refactored unskip_meal
create or replace function unskip_meal(
  p_member_id uuid,
  p_entry_date date,
  p_meal_id uuid,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_meal record;
  v_entry record;
  v_sub record;
  v_cutoff_ts timestamptz;
  v_key text;
  v_balance int := 0;
begin
  perform 1 from members where id = p_member_id for update;

  select * into v_meal from meals where id = p_meal_id;
  v_cutoff_ts := (p_entry_date + v_meal.start_time - (v_meal.cutoff_minutes || ' minutes')::interval) at time zone 'Asia/Kolkata';

  if now() >= v_cutoff_ts then
    return jsonb_build_object('success', false, 'error', 'CUTOFF_PASSED', 'message', 'Locked. The cut-off passed at ' || to_char(v_cutoff_ts, 'HH12:MI AM') || '.');
  end if;

  select * into v_entry from meal_entries
  where member_id = p_member_id and entry_date = p_entry_date and meal_id = p_meal_id;

  if v_entry.id is null or v_entry.status = 'expected' then
    select coalesce(sum(delta), 0) into v_balance from credit_ledger where member_id = p_member_id;
    return jsonb_build_object('success', true, 'status', 'expected', 'credits_balance', v_balance);
  end if;

  update meal_entries set status = 'expected', updated_at = now() where id = v_entry.id and status = 'skipped';

  select * into v_sub from subscriptions where id = v_entry.subscription_id;
  if v_sub.plan_type = 'monthly' then
    v_key := coalesce(p_idempotency_key, 'skip_reversed:' || v_entry.id || ':' || v_entry.skip_count);
    insert into credit_ledger (member_id, delta, reason, idempotency_key, meal_entry_id)
    values (p_member_id, -1, 'skip_reversed', v_key, v_entry.id)
    on conflict (idempotency_key) do nothing;
  end if;

  select coalesce(sum(delta), 0) into v_balance from credit_ledger where member_id = p_member_id;
  return jsonb_build_object('success', true, 'status', 'expected', 'credits_balance', v_balance);
end;
$$;

-- 4. Refactored member_summary RPC
create or replace function get_member_summary(p_member_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub record;
  v_tz text := 'Asia/Kolkata';
  v_db_now timestamptz := now();
  v_today date := (v_db_now at time zone v_tz)::date;
  v_credits int := 0;
  v_taken int := 0;
  v_skipped int := 0;
  v_upcoming int := 0;
  v_plan_days_total int := 0;
  v_days_left int := 0;
  v_first_day_left date;
  v_mpd int := 1;
  v_last_meal_end timestamptz;
  v_today_finished boolean := false;
  v_meals_left int := 0;
begin
  select coalesce(sum(delta), 0) into v_credits from credit_ledger where member_id = p_member_id;

  select * into v_sub from subscriptions
  where member_id = p_member_id and status = 'active'
    and start_date <= v_today and (end_date is null or end_date >= v_today)
  order by created_at desc limit 1;

  if v_sub.id is null then
    return jsonb_build_object('credits', v_credits, 'status', 'no_active_plan');
  end if;

  v_mpd := greatest(1, array_length(v_sub.meal_ids, 1));

  -- Check if today is finished
  select max((v_today + m.start_time + (m.duration_minutes || ' minutes')::interval) at time zone v_tz) into v_last_meal_end
  from meals m where m.id = any(v_sub.meal_ids);

  if v_db_now >= v_last_meal_end then
    v_today_finished := true;
  end if;

  if v_sub.plan_type = 'monthly' then
    v_plan_days_total := v_sub.end_date - v_sub.start_date + 1;
    if v_today_finished then
      v_first_day_left := v_today + 1;
    else
      v_first_day_left := v_today;
    end if;
    v_days_left := greatest(0, v_sub.end_date - v_first_day_left + 1);

    select count(*) filter (where coalesce(e.status, 'expected') in ('expected','taken') and ((s.d + m.start_time + (m.duration_minutes || ' minutes')::interval) at time zone v_tz) <= v_db_now) as taken_cnt,
           count(*) filter (where e.status = 'skipped') as skipped_cnt,
           count(*) filter (where coalesce(e.status, 'expected') = 'expected' and ((s.d + m.start_time + (m.duration_minutes || ' minutes')::interval) at time zone v_tz) > v_db_now) as upcoming_cnt
    into v_taken, v_skipped, v_upcoming
    from generate_series(v_sub.start_date, v_sub.end_date, interval '1 day') s(d)
    cross join unnest(v_sub.meal_ids) mid
    join meals m on m.id = mid
    left join meal_entries e on e.member_id = p_member_id and e.entry_date = s.d::date and e.meal_id = m.id;

    return jsonb_build_object(
      'plan_type', 'monthly',
      'days_left', v_days_left,
      'plan_days_total', v_plan_days_total,
      'meals_taken', v_taken,
      'meals_skipped', v_skipped,
      'meals_upcoming', v_upcoming,
      'credits', v_credits,
      'credit_days', floor(v_credits / v_mpd)
    );
  else
    -- Ticket plan
    select count(*) into v_taken
    from generate_series(v_sub.start_date, v_today, interval '1 day') s(d)
    cross join unnest(v_sub.meal_ids) mid
    join meals m on m.id = mid
    left join meal_entries e on e.member_id = p_member_id and e.entry_date = s.d::date and e.meal_id = m.id
    where coalesce(e.status, 'expected') in ('expected','taken')
      and ((s.d + m.start_time + (m.duration_minutes || ' minutes')::interval) at time zone v_tz) <= v_db_now;

    v_meals_left := greatest(0, v_sub.meals_total - v_taken);
    v_days_left := ceil(v_meals_left::numeric / v_mpd);

    return jsonb_build_object(
      'plan_type', 'ticket',
      'meals_left', v_meals_left,
      'days_left', v_days_left,
      'meals_taken', v_taken,
      'credits', 0
    );
  end if;
end;
$$;

-- 5. Extend subscription with credits
create or replace function extend_subscription(
  p_member_id uuid,
  p_subscription_id uuid,
  p_days int,
  p_actor text default 'admin'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub record;
  v_mpd int := 1;
  v_cost int := 0;
  v_balance int := 0;
  v_new_end date;
  v_key text;
begin
  perform 1 from members where id = p_member_id for update;

  select * into v_sub from subscriptions where id = p_subscription_id;
  if v_sub.id is null then
    return jsonb_build_object('success', false, 'error', 'SUBSCRIPTION_NOT_FOUND');
  end if;

  v_mpd := greatest(1, array_length(v_sub.meal_ids, 1));
  v_cost := p_days * v_mpd;

  select coalesce(sum(delta), 0) into v_balance from credit_ledger where member_id = p_member_id;
  if v_balance < v_cost then
    return jsonb_build_object('success', false, 'error', 'NOT_ENOUGH_CREDITS');
  end if;

  v_new_end := v_sub.end_date + p_days;
  v_key := 'extension:' || v_sub.id || ':' || (v_sub.end_date - v_sub.start_date + p_days);

  insert into credit_ledger (member_id, delta, reason, idempotency_key)
  values (p_member_id, -v_cost, 'extension_used', v_key);

  update subscriptions set end_date = v_new_end, status = 'active' where id = v_sub.id;

  select coalesce(sum(delta), 0) into v_balance from credit_ledger where member_id = p_member_id;

  return jsonb_build_object(
    'success', true,
    'new_end_date', v_new_end,
    'credits_balance', v_balance
  );
end;
$$;

-- Migration: 005_headcount_rpc.sql

-- Atomic RPC to snapshot and lock cook headcount at cutoff
create or replace function lock_meal_headcount_atomic(
  p_entry_date date,
  p_meal_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_expected int := 0;
  v_skipped int := 0;
  v_extra int := 0;
  v_db_now timestamptz := now();
  v_existing record;
begin
  -- Calculate net headcount stats
  select
    count(*) filter (where status = 'expected' and is_extra = false) as expected_cnt,
    count(*) filter (where status = 'skipped') as skipped_cnt,
    count(*) filter (where status = 'expected' and is_extra = true) as extra_cnt
  into v_expected, v_skipped, v_extra
  from meal_entries
  where entry_date = p_entry_date
    and meal_id = p_meal_id;

  select * into v_existing
  from meal_headcounts
  where entry_date = p_entry_date
    and meal_id = p_meal_id;

  if v_existing.entry_date is not null then
    -- Already locked, update late changes count
    update meal_headcounts
    set late_changes = (v_expected + v_extra) - (v_existing.expected_count + v_existing.extra_count)
    where entry_date = p_entry_date
      and meal_id = p_meal_id;
  else
    -- Lock snapshot
    insert into meal_headcounts (entry_date, meal_id, expected_count, skipped_count, extra_count, late_changes, locked_at)
    values (p_entry_date, p_meal_id, v_expected, v_skipped, v_extra, 0, v_db_now);
  end if;

  return jsonb_build_object(
    'success', true,
    'expected_count', v_expected,
    'skipped_count', v_skipped,
    'extra_count', v_extra,
    'net_coming', v_expected + v_extra
  );
end;
$$;

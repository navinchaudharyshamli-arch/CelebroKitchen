-- Migration: 006_ate_anyway_and_kitchen_rpc.sql

-- Atomic Ate-Anyway RPC function
create or replace function ate_anyway_atomic(
  p_member_id uuid,
  p_entry_date date,
  p_meal_id uuid,
  p_recorded_by text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_entry record;
  v_meal record;
  v_credit_balance int := 0;
  v_existing_resp jsonb;
  v_charge_id uuid;
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

  -- 3. Check meal entry state
  select * into v_entry
  from meal_entries
  where member_id = p_member_id
    and entry_date = p_entry_date
    and meal_id = p_meal_id;

  if v_entry.id is null or v_entry.status != 'skipped' then
    return jsonb_build_object('success', false, 'error', 'Entry is not in skipped status');
  end if;

  select * into v_meal from meals where id = p_meal_id;

  -- 4. Calculate member credit balance
  select coalesce(sum(delta), 0) into v_credit_balance
  from credit_ledger
  where member_id = p_member_id;

  -- 5. Update meal entry to expected with served_after_skip flag
  update meal_entries
  set status = 'expected',
      served_after_skip = true,
      updated_at = now()
  where id = v_entry.id;

  -- 6. Apply credit deduction or charge
  if v_credit_balance >= 1 then
    insert into credit_ledger (member_id, delta, reason, idempotency_key, meal_entry_id, created_by)
    values (p_member_id, -1, 'ate_anyway', 'ate_anyway:' || v_entry.id || ':' || v_entry.skip_count, v_entry.id, p_recorded_by)
    on conflict (idempotency_key) do nothing;
  else
    insert into charges (member_id, subscription_id, meal_entry_id, kind, amount, description, created_by)
    values (p_member_id, v_entry.subscription_id, v_entry.id, 'extra_meal', v_meal.price_per_meal, 'Ate anyway without credit', p_recorded_by)
    returning id into v_charge_id;
  end if;

  v_existing_resp := jsonb_build_object(
    'success', true,
    'entry_id', v_entry.id,
    'status', 'expected',
    'served_after_skip', true,
    'used_credit', v_credit_balance >= 1
  );

  insert into idempotency_keys (key, member_id, action, response)
  values (p_idempotency_key, p_member_id, 'ate_anyway', v_existing_resp);

  return v_existing_resp;
end;
$$;

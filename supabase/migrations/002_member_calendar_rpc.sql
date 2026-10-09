-- Function to retrieve student habit calendar with virtual expected rows and effective status derived at read time
create or replace function get_member_calendar(
  p_member_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  entry_id uuid,
  member_id uuid,
  subscription_id uuid,
  entry_date date,
  meal_id uuid,
  meal_code text,
  meal_name text,
  short_label text,
  start_time time,
  duration_minutes int,
  cutoff_minutes int,
  price_per_meal numeric,
  stored_status text,
  effective_status text,
  is_extra boolean,
  extra_payment text,
  skip_count int,
  is_virtual boolean
)
language plpgsql
security definer
as $$
declare
  v_sub record;
  v_curr_date date;
  v_meal record;
  v_entry record;
  v_effective text;
  v_meal_end_ts timestamptz;
  v_db_now timestamptz := now();
  v_taken_count int := 0;
  v_upcoming_count int := 0;
begin
  -- 1. Find active subscription for the member that overlaps range
  select * into v_sub
  from subscriptions
  where subscriptions.member_id = p_member_id
    and status = 'active'
    and start_date <= p_end_date
    and (end_date is null or end_date >= p_start_date)
  order by created_at desc
  limit 1;

  -- Calculate taken count for ticket plans
  if v_sub.plan_type = 'ticket' then
    select count(*) into v_taken_count
    from meal_entries me
    join meals m on me.meal_id = m.id
    where me.member_id = p_member_id
      and me.subscription_id = v_sub.id
      and (
        me.status = 'taken' or 
        (me.status = 'expected' and (me.entry_date + m.start_time + (m.duration_minutes || ' minutes')::interval) <= v_db_now)
      );
  end if;

  -- Loop through each date in range
  v_curr_date := p_start_date;
  while v_curr_date <= p_end_date loop
    for v_meal in 
      select * from meals 
      where active = true 
      order by sort_order asc 
    loop
      -- Check if meal is in subscription
      if v_sub.id is not null and v_meal.id = any(v_sub.meal_ids) and v_curr_date >= v_sub.start_date and (v_sub.end_date is null or v_curr_date <= v_sub.end_date) then
        
        -- Check if stored row exists
        select * into v_entry
        from meal_entries
        where meal_entries.member_id = p_member_id
          and meal_entries.entry_date = v_curr_date
          and meal_entries.meal_id = v_meal.id;

        if v_entry.id is not null then
          -- Derive effective status
          v_meal_end_ts := (v_curr_date + v_meal.start_time + (v_meal.duration_minutes || ' minutes')::interval) at time zone 'Asia/Kolkata';
          if v_entry.status = 'closed' then
            v_effective := 'closed';
          elsif v_entry.status = 'skipped' then
            v_effective := 'skipped';
          elsif v_entry.status in ('expected', 'taken') and v_db_now >= v_meal_end_ts then
            v_effective := 'taken';
          else
            v_effective := 'upcoming';
          end if;

          entry_id := v_entry.id;
          member_id := p_member_id;
          subscription_id := v_entry.subscription_id;
          entry_date := v_curr_date;
          meal_id := v_meal.id;
          meal_code := v_meal.code;
          meal_name := v_meal.name;
          short_label := v_meal.short_label;
          start_time := v_meal.start_time;
          duration_minutes := v_meal.duration_minutes;
          cutoff_minutes := v_meal.cutoff_minutes;
          price_per_meal := v_meal.price_per_meal;
          stored_status := v_entry.status;
          effective_status := v_effective;
          is_extra := v_entry.is_extra;
          extra_payment := v_entry.extra_payment;
          skip_count := v_entry.skip_count;
          is_virtual := false;
          return next;
        else
          -- Check ticket count limit
          if v_sub.plan_type = 'ticket' then
            if (v_taken_count + v_upcoming_count) >= v_sub.meals_total then
              continue;
            end if;
          end if;

          v_meal_end_ts := (v_curr_date + v_meal.start_time + (v_meal.duration_minutes || ' minutes')::interval) at time zone 'Asia/Kolkata';
          if v_db_now >= v_meal_end_ts then
            v_effective := 'taken';
          else
            v_effective := 'upcoming';
            v_upcoming_count := v_upcoming_count + 1;
          end if;

          entry_id := null;
          member_id := p_member_id;
          subscription_id := v_sub.id;
          entry_date := v_curr_date;
          meal_id := v_meal.id;
          meal_code := v_meal.code;
          meal_name := v_meal.name;
          short_label := v_meal.short_label;
          start_time := v_meal.start_time;
          duration_minutes := v_meal.duration_minutes;
          cutoff_minutes := v_meal.cutoff_minutes;
          price_per_meal := v_meal.price_per_meal;
          stored_status := 'expected';
          effective_status := v_effective;
          is_extra := false;
          extra_payment := null;
          skip_count := 0;
          is_virtual := true;
          return next;
        end if;
      end if;
    end loop;
    v_curr_date := v_curr_date + 1;
  end loop;
end;
$$;

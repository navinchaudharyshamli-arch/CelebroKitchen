-- Seed default settings and meals
insert into settings (key, value) values
  ('timezone', '"Asia/Kolkata"'::jsonb),
  ('mess_name', '"Celebro Kitchen"'::jsonb),
  ('max_advance_days', '14'::jsonb),
  ('max_holiday_days', '30'::jsonb),
  ('renewal_window_days', '7'::jsonb),
  ('pin_length', '5'::jsonb),
  ('admin_skip_notification', '"instant"'::jsonb),
  ('student_skip_email_enabled', 'true'::jsonb),
  ('admin_notify_emails', '[]'::jsonb),
  ('email_daily_cap', '90'::jsonb),
  ('email_digest_switch_percent', '70'::jsonb),
  ('dues_policy', '"warn"'::jsonb),
  ('dues_limit', '500'::jsonb),
  ('plates_variance_threshold', '5'::jsonb),
  ('credit_scope', '"any"'::jsonb),
  ('credit_policy', '"rollover"'::jsonb),
  ('rollover_cap', 'null'::jsonb),
  ('credit_expiry_days', '30'::jsonb)
on conflict (key) do nothing;

insert into meals (code, name, short_label, start_time, duration_minutes, cutoff_minutes, price_per_meal, sort_order, active) values
  ('breakfast', 'Breakfast', 'B', '08:00:00', 90, 60, 50.00, 1, true),
  ('lunch', 'Lunch', 'L', '12:00:00', 90, 60, 80.00, 2, true),
  ('dinner', 'Dinner', 'D', '19:30:00', 90, 60, 80.00, 3, true)
on conflict (code) do nothing;

-- Migration: 001_initial_schema.sql
create extension if not exists pgcrypto;

create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  short_label text not null,
  start_time time not null,
  duration_minutes int not null default 90,
  cutoff_minutes int not null default 60,
  price_per_meal numeric(10,2) not null default 0,
  sort_order int not null default 0,
  active boolean not null default true
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_code text unique not null,
  full_name text not null,
  phone text unique,
  email text not null,
  pin_hash text,
  must_change_pin boolean not null default false,
  pin_failed_count int not null default 0,
  locked_until timestamptz,
  status text not null default 'active' check (status in ('active','inactive')),
  joined_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  plan_type text not null check (plan_type in ('monthly','ticket')),
  meal_ids uuid[] not null,
  start_date date not null,
  end_date date,
  meals_total int,
  terms jsonb not null,
  status text not null default 'active' check (status in ('active','ended','cancelled')),
  created_at timestamptz not null default now(),
  check ((plan_type='monthly' and end_date is not null and meals_total is null)
      or (plan_type='ticket' and meals_total is not null))
);
create index if not exists idx_subscriptions_member on subscriptions (member_id, status, start_date, end_date);

create table if not exists subscription_amendments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id),
  amended_by text not null,
  reason text not null,
  before jsonb not null,
  after jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists holidays (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  start_date date not null,
  end_date date not null,
  meal_ids uuid[],
  note text,
  created_by text not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists meal_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  subscription_id uuid references subscriptions(id),
  holiday_id uuid references holidays(id),
  entry_date date not null,
  meal_id uuid not null references meals(id),
  status text not null default 'expected'
    check (status in ('expected','skipped','closed','taken')),
  is_extra boolean not null default false,
  extra_payment text check (extra_payment in ('credit','paid')),
  skip_count int not null default 0,
  extra_count int not null default 0,
  skipped_at timestamptz,
  served_after_skip boolean not null default false,
  flagged boolean not null default false,
  flag_reason text,
  updated_at timestamptz not null default now(),
  unique (member_id, entry_date, meal_id)
);
create index if not exists idx_meal_entries_date_meal on meal_entries (entry_date, meal_id, status);

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  delta int not null,
  reason text not null,
  idempotency_key text not null unique,
  meal_entry_id uuid references meal_entries(id),
  note text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_credit_ledger_member on credit_ledger (member_id);

create table if not exists charges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  subscription_id uuid references subscriptions(id),
  meal_entry_id uuid references meal_entries(id),
  kind text not null check (kind in ('subscription','extra_meal','adjustment','reversal')),
  amount numeric(10,2) not null,
  reverses_id uuid references charges(id),
  description text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  subscription_id uuid references subscriptions(id),
  amount numeric(10,2) not null,
  reverses_id uuid references payments(id),
  method text not null default 'upi' check (method in ('upi','cash','other')),
  paid_on date not null default current_date,
  note text,
  recorded_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists closed_days (
  id uuid primary key default gen_random_uuid(),
  closed_date date not null,
  meal_id uuid references meals(id),
  reason text,
  unique (closed_date, meal_id)
);

create table if not exists meal_headcounts (
  entry_date date not null,
  meal_id uuid not null references meals(id),
  expected_count int not null,
  skipped_count int not null,
  extra_count int not null,
  late_changes int not null default 0,
  locked_at timestamptz not null default now(),
  primary key (entry_date, meal_id)
);

create table if not exists meal_service_counts (
  entry_date date not null,
  meal_id uuid not null references meals(id),
  plates_served int not null,
  entered_by text not null,
  updated_at timestamptz not null default now(),
  primary key (entry_date, meal_id)
);

create table if not exists pin_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  code_hash text not null,
  purpose text not null default 'reset' check (purpose in ('reset','setup')),
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  token_hash text not null,
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists login_attempts (
  id bigserial primary key,
  member_id uuid,
  ip text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_ip on login_attempts (ip, created_at);
create index if not exists idx_login_attempts_member on login_attempts (member_id, created_at);

create table if not exists idempotency_keys (
  key text primary key,
  member_id uuid,
  action text not null,
  response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists email_outbox (
  id bigserial primary key,
  to_email text not null,
  template text not null,
  priority int not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','dropped')),
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists staff_profiles (
  user_id uuid primary key,
  role text not null check (role in ('admin','staff')),
  display_name text
);

create table if not exists audit_log (
  id bigserial primary key,
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- Triggers for immutability
create or replace function block_update_delete()
returns trigger as $$
begin
  raise exception 'UPDATE or DELETE operation is prohibited on table %', TG_TABLE_NAME;
end;
$$ language plpgsql;

create or replace trigger trg_credit_ledger_immutable
before update or delete on credit_ledger
for each row execute function block_update_delete();

create or replace trigger trg_charges_immutable
before update or delete on charges
for each row execute function block_update_delete();

create or replace trigger trg_payments_immutable
before update or delete on payments
for each row execute function block_update_delete();

create or replace trigger trg_audit_log_immutable
before update or delete on audit_log
for each row execute function block_update_delete();

-- RLS setup (Enable on all tables, default no public policy)
alter table settings enable row level security;
alter table meals enable row level security;
alter table members enable row level security;
alter table subscriptions enable row level security;
alter table subscription_amendments enable row level security;
alter table holidays enable row level security;
alter table meal_entries enable row level security;
alter table credit_ledger enable row level security;
alter table charges enable row level security;
alter table payments enable row level security;
alter table closed_days enable row level security;
alter table meal_headcounts enable row level security;
alter table meal_service_counts enable row level security;
alter table pin_reset_tokens enable row level security;
alter table sessions enable row level security;
alter table login_attempts enable row level security;
alter table idempotency_keys enable row level security;
alter table email_outbox enable row level security;
alter table staff_profiles enable row level security;
alter table audit_log enable row level security;

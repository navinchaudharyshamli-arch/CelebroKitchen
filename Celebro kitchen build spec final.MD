# Celebro Kitchen: Complete Build Specification (Final)

## 0. INSTRUCTIONS TO THE AI AGENT / IDE (read first)

You are a senior full-stack engineer. Build the application described in this single document. It is the **only** source of truth; ignore any earlier versions.

**Working rules**
1. Read this entire document before writing code.
2. Build **one phase at a time** (§17). After each phase run the tests listed for it (§18), fix failures, then post a short report: what was built, tests passed, any ambiguity. Then continue to the next phase.
3. Values marked **DEFAULT** are decided; use them without asking. Values marked **CONFIGURABLE** must live in the database (`settings` or `meals` tables) and be editable in the admin panel. **Never hardcode business values**: meal names, times, cutoffs, prices, credit rules, plan types, email limits, thresholds.
4. If something is genuinely ambiguous, choose the simplest option consistent with this document, record it in `DECISIONS.md`, and continue.
5. Put all business rules in `/lib` as pure, unit-tested functions. UI and route handlers only call them. Use Postgres functions (RPC) for every multi-step mutation.
6. Keep it **minimal, fast, mobile-first**, and follow the design system in §15 (you have freedom inside its rules). Do not add features not described here. **Do not collect or store photos.** Do not build a QR/daily-scan attendance feature.
7. **Deliverables the repo must contain when finished:**
   - `README.md`: setup, environment variables, migrations, seeding, cron setup, deployment, backup and restore procedure, privacy note.
   - `.env.example`
   - `DECISIONS.md`: every assumption you made.
   - `DESIGN.md`: the design tokens (colours, type scale, spacing, radii), component notes, and the performance numbers you measured against §15.8.
   - **`TODO.md`: a plain-language, step-by-step checklist for the mess owner (a non-developer) covering everything he must do after the build to go live. Requirements are in §19. This file is mandatory.**
   - `supabase/migrations/*.sql`, seed script, tests.

---

## 1. Product summary

Celebro Kitchen is a mess (canteen) serving breakfast, lunch and dinner to college students and others on subscription. Members can subscribe to any combination of meals (one, two or three a day), on a monthly basis or a ticket (prepaid meal count) basis.

**The model is skip-only.** Everyone is **expected by default** for every meal they subscribed to. Members do nothing on a normal day. They only open the app to **skip a meal**, **mark a holiday**, or **add an extra meal**. Skipping before the deadline earns a **meal credit** that can be spent on extra meals or carried forward.

The app must:
1. Record who subscribed to what and for how long.
2. Show students a simple dashboard of their meals, days left and credits.
3. Let students skip meals, add extras and mark holidays within admin-configured deadlines.
4. Give the cook an accurate **headcount before each meal's cutoff**, and staff a clear **serve / do-not-serve list**.
5. Give the owner a full admin panel to control everything.

Scale: one mess, about 50 to 300 members, 1 to 3 admins/staff. Everything must run on **free tiers**.

### Non-goals
Online payment gateway (payments are recorded manually) · multi-mess/multi-tenant · native apps (build a PWA) · photos of members · QR/daily scan attendance · menu planning, inventory, accounting.

---

## 2. Tech stack (all free)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript), server actions + route handlers |
| UI | Tailwind CSS driven by the CSS-variable tokens in §15; copy in only the few shadcn/ui components actually needed (sheet, dialog, table, input). Minimal, high contrast, large tap targets |
| Database | Supabase Postgres. Access **only from the server** with the service role key |
| Admin/staff auth | Supabase Auth (email + password) |
| Member auth | Own lightweight auth: Member ID + PIN, email one-time code for reset/first setup. **Do not add Clerk or other third-party auth** |
| Hosting | Cloudflare Pages or Netlify (**DEFAULT**). Vercel Hobby is non-commercial per its terms; avoid |
| Email | Resend or Brevo free tier, always through the `email_outbox` table |
| Scheduled jobs | Supabase `pg_cron` or GitHub Actions cron calling secured routes. Do not rely on Vercel free cron |
| Backups | GitHub Actions scheduled `pg_dump`, encrypted |
| Validation | Zod on every input |
| Time | `date-fns` + `date-fns-tz`; all business logic in the configured timezone (DEFAULT `Asia/Kolkata`) |
| PWA | Web manifest **with app shortcuts** + service worker caching the app shell only; never cache attendance/API responses |

`.env.example`:
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # server only, never sent to the browser
DATABASE_URL=                   # used by the backup workflow only
SESSION_SECRET=                 # 32+ random bytes
CRON_SECRET=                    # protects /api/cron/*
EMAIL_API_KEY=
EMAIL_FROM=
APP_URL=
```

---

## 3. Roles

| Role | Access |
|---|---|
| `admin` | Everything |
| `staff` | `/kitchen` only |
| `member` | Own data only, via Member ID + PIN and a signed httpOnly session cookie |

Authorisation is checked on **every** server action and route handler, never only in the UI.

---

## 4. Domain rules

### 4.1 Meals
Rows in `meals` (not enums). Seeds: Breakfast, Lunch (12:00), Dinner (19:30), each with `short_label` (B/L/D), `start_time`, `duration_minutes` (DEFAULT 90), `cutoff_minutes` (**DEFAULT 60**, CONFIGURABLE per meal), `price_per_meal`, `active`, `sort_order`.

### 4.2 Subscriptions
A member may have many subscription records over time. **Never overwrite**; a change creates a new record or an audited amendment (§4.11).
- `monthly`: valid `start_date` to `end_date`, for a chosen non-empty set of meals.
- `ticket`: prepaid `meals_total`, no end date. A meal that is **taken** consumes one ticket. Skipped meals do **not** consume a ticket and earn no credit for ticket plans.
- Overlapping active subscriptions for one member are rejected.
- Each subscription stores a `terms` snapshot (§4.11). A job sets `status='ended'` when a monthly plan passes `end_date` or a ticket plan reaches zero.

### 4.3 Entry states and legal transitions
Each member + date + meal has at most one `meal_entries` row (unique). Stored statuses: `expected`, `skipped`, `closed`, `taken`. `is_extra` marks a meal outside the subscribed set.

`taken` means "was expected and not skipped, and the meal has ended". It is **derived at read time** (§5) and optionally persisted by a job. Because there is no scan, never describe it as "eaten".

**Only these transitions are legal; reject all others.**

| From | To | Actor | Condition |
|---|---|---|---|
| expected | skipped | member | before cutoff (DB clock) |
| skipped | expected | member | before cutoff (DB clock) |
| expected | closed | admin (close day) | |
| closed | expected | admin (reopen day) | |
| skipped | expected ("ate anyway") | staff/admin | audited, see §4.8 |
| any | any | admin override | audited, note required |

**Race safety:** every transition is a conditional update, for example `update meal_entries set status='skipped', skip_count=skip_count+1, skipped_at=now() where id=$1 and status='expected' and now() < cutoff_ts returning *`. Zero rows returned means the action lost the race; return a clear message. Ledger, charge and payment writes occur **in the same transaction** (Postgres function with the member row locked via `select ... for update`).

**Time rule:** cutoff and meal-end checks use the **database clock** (`now()`), never the client's or the app server's clock.

### 4.4 Skipping
- Default: the member will take every subscribed meal.
- A member may skip a meal any time before `start_time − cutoff_minutes`, up to `max_advance_days` ahead (CONFIGURABLE, DEFAULT 14).
- A skip on a **monthly** plan adds `+1` credit (reason `skip`). Undo before cutoff adds `−1` (reason `skip_reversed`).
- Actions: skip one meal, skip a whole day, mark a holiday (§4.10).

### 4.5 Credits
- Credits are a generic count of meals. **DEFAULT: usable for any meal** (per-subscription terms: `credit_scope` = `any` | `same_meal`).
- Balance = `SUM(delta)` over `credit_ledger`. **No mutable balance column.** The ledger is append-only (DB triggers block UPDATE/DELETE).
- Sources: `skip`, `mess_closed`, `admin_grant`, `admin_holiday`, `extra_cancelled`. Sinks: `extra_meal`, `admin_deduct`, `expiry`, `skip_reversed`, `ate_anyway`.
- Member actions can never make a balance negative (lock the member row inside the transaction).

### 4.6 Idempotency (critical)
- Every ledger row has a unique `idempotency_key`, deterministic from the action:
  `skip:{entry_id}:{skip_count}` · `skip_reversed:{entry_id}:{skip_count}` · `extra_meal:{entry_id}:{extra_count}` · `extra_cancelled:{entry_id}:{extra_count}` · `closed:{entry_id}` · `ate_anyway:{entry_id}:{skip_count}` · `expiry:{member_id}:{period}` · `admin_holiday:{entry_id}:{skip_count}`.
  A retry that hits an existing key is a no-op returning the original result. A unique constraint makes double-issuing impossible even if application code is buggy.
- Mutating member requests also accept an `Idempotency-Key` header; the response is stored in `idempotency_keys` for 24 hours so double-taps and retries return the first result.
- **Nightly integrity check:** recompute each member's expected balance from entries and compare with the ledger. Mismatches show on the admin dashboard (no email).

### 4.7 Extra meals
Before cutoff, a member can add a meal outside their subscription (an empty square in the grid):
- Balance ≥ 1 → entry `is_extra=true, extra_payment='credit'`, ledger `−1`, **no charge**.
- Else → `extra_payment='paid'` plus a **charge** at the meal's current `price_per_meal` (**snapshotted on the charge**). The member sees "Pay ₹X at the counter".
- Cancel before cutoff: credit refunded (`+1`) or the charge reversed by a reversing row. After cutoff no refund.
- Walk-ins (unplanned, at the counter) are added by staff in `/kitchen`: uses a credit if available, else creates a charge.

### 4.8 "Ate anyway"
When a student who skipped turns up and is served, staff press **Ate anyway** in `/kitchen`: entry returns to `expected` with `served_after_skip=true`. If balance ≥ 1 apply `−1` credit (reason `ate_anyway`); otherwise create a **charge** at the snapshotted meal price. Idempotent and audited. The student sees a clear explanation in their history.

### 4.9 Payments and dues (derived, never flagged)
- `charges` = what a member owes (subscription amount, extra meals, adjustments). `payments` = what they paid.
- **Dues = SUM(charges) − SUM(payments)**, per member and per subscription. Status (`unpaid`/`partial`/`paid`) is **derived, never stored**.
- Both tables are **immutable**. Corrections are **reversal rows** (negative amount with `reverses_id`). No edits, no deletes.
- Every payment records who confirmed it (`recorded_by`). Manual confirmation by authorised admins/staff is allowed and audited.
- CONFIGURABLE `dues_policy` (**DEFAULT `warn`**): `allow` | `warn` | `block_extras` (block new paid extras when dues exceed `dues_limit`).

### 4.10 Holidays and closed days
**Student/admin holiday (a longer absence):**
- Form: from date, to date, meals (DEFAULT all subscribed), optional note, with a **preview** ("14 meals, +14 credits") before confirming.
- Server-side, in one transaction: each affected meal that is still **before its cutoff** and in the member's subscription becomes `skipped` with `+1` credit (idempotent keys). Meals already past cutoff are excluded and the preview says so.
- Maximum length `max_holiday_days` (CONFIGURABLE, DEFAULT 30).
- A holiday can be **cancelled or shortened**: remaining future meals still before cutoff return to `expected` and their credits are reversed (`skip_reversed`).
- One holiday = **one** holiday record, **one** admin email, **one** student email.
- **Admin** can create/edit/cancel a holiday for any member from the member page and from a dashboard quick action. Admin may include **past dates**: requires a note, grants credits with reason `admin_holiday`, fully audited.

**Mess closed day (whole mess):** admin marks a date (all meals or specific meals) closed. Affected `expected` entries become `closed`; each affected member gets `+1` per meal (idempotent). Reopening reverses.

**Leftover credits at month end**, per subscription `terms.credit_policy` (**DEFAULT `rollover`**, no cap): `rollover` | `extend` (admin confirms converting `floor(credits / meals_per_day)` into extra days; never silently) | `expire` (after `credit_expiry_days`, ledger row `expiry`).

### 4.11 Terms snapshot and amendments
- On creation each subscription stores `terms` JSON: per-meal `price_per_meal`, `amount_due`, `credit_scope`, `credit_policy`, `rollover_cap`, `credit_expiry_days`. They **never change** because global settings changed.
- Changing terms on an existing subscription requires a `subscription_amendments` row (who, when, reason, before/after) plus an audit entry.
- **Operational settings stay global and apply immediately to everyone:** meal times, durations, cutoff minutes, `max_advance_days`, closed days, holiday limits.

### 4.12 Headcount for the cook
- Live headcount per meal: **coming (net) = expected + extras**, plus skipped count and extras count.
- At each meal's **cutoff**, a job locks a snapshot in `meal_headcounts`. Later changes (walk-ins, ate-anyway, admin overrides) are counted as `late_changes`, shown as "Cook 118 (+2 late)".
- `/admin/headcount` is a clean printable page with a **Share on WhatsApp** button that opens `https://wa.me/?text=` with a prefilled plain-text summary (meal, date, headcount, skips). No WhatsApp API.
- Staff enter **plates served** per meal; the dashboard shows `plates_served − net_coming` and highlights a sustained positive variance beyond `plates_variance_threshold` (dashboard only, no email).

---

## 5. "Always up to date" without a scan or waiting for jobs

**Principle: the UI derives each status from the clock at read time. Correctness never depends on a cron job having run.**

```
effective_status(entry, now) =
  closed     if entry.status = 'closed'
  skipped    if entry.status = 'skipped'
  upcoming   if entry.status in ('expected') and now < meal_end
  taken      if entry.status in ('expected','taken') and now >= meal_end
meal_end = entry_date + meal.start_time + meal.duration_minutes   (configured timezone, DB clock)
```
- A student opening the app after a meal ends sees a **green tick immediately**.
- **Virtual rows:** if a date inside a subscription has no stored row (generation job failed or the date is beyond the horizon), the calendar function **fills it virtually** as `expected` from the subscription. A skip or extra on a virtual date creates the real row inside the same transaction.
- Implement one Postgres function `member_calendar(member_id, from, to)` returning stored + virtual rows with effective status. The admin dashboard uses an equivalent function for counts.
- Jobs only do housekeeping (§13).

### Student summary numbers (computed on read)
- **Days left** (monthly): `end_date − today` (counting today if any meal is still upcoming).
- **Days gone**: days since `start_date` with at least one `taken` meal.
- **Meals taken** (not skipped), **Meals skipped**, **Credits** (ledger balance).
- **Ticket plans**: `Meals left = meals_total − taken`.

---

## 6. Student experience

### 6.1 Login and onboarding
- Member ID (or phone) + PIN (DEFAULT 5 digits, CONFIGURABLE 4 to 6; hashed; never logged or emailed).
- **Rate limit and lockout:** 5 failed PINs per member or 20 per IP per 10 minutes → lock 15 minutes (`login_attempts`). Identical response for unknown member vs wrong PIN.
- **First-time PIN:** when admin creates a member, the system issues a one-time **setup code** (valid 7 days, same mechanism as reset) and shows a **temporary PIN once** to the admin as an alternative. CSV import produces a **one-time downloadable list of temporary PINs** (for printed slips) because bulk invite emails would exceed free email limits; invite emails go in the lowest-priority lane. Temporary PINs set `must_change_pin=true`.
- Sessions: signed httpOnly Secure SameSite=Lax cookie, 30-day sliding expiry.

### 6.2 Self-service PIN reset (no admin involvement)
- `/forgot`: member enters Member ID, phone or email. Response is **always** "If an account exists, a code was sent to the registered email".
- 6-digit one-time code, stored hashed, expires in 15 minutes, single use, max 5 attempts, max 3 requests per hour per member. Highest-priority email lane.
- On success: new PIN set, **all sessions revoked**, "PIN changed" email sent. `/me` offers "Change PIN" (requires the current PIN).
- **Email is mandatory** for every member.

### 6.3 Dashboard design (habit-grid)
Colours, typography and exact visual treatment come from §15; this section defines structure and behaviour.

Visual reference: a habit-tracker grid of rounded coloured squares. **Days run vertically; each day has a horizontal strip of squares, one per active meal (B, L, D).**

**Layout (mobile first, single column)**
- **Sticky header:** chips **Days left · Meals taken · Skipped · Credits**, and a **Holiday** button.
- **Column header row:** meal short labels aligned above the squares (from `meals`; only active meals).
- **Rows:** weekday + date (e.g. `Wed 8`), today highlighted with a ring, then the strip.
- **Collapsible:** days are grouped into **weeks**, each week collapsible. Default: current and next week expanded; previous and older weeks collapsed (older grouped under month headings). A **day row can expand** to show per-meal detail (time, state, cutoff or credit info). Expand/collapse state remembered locally.
- **Range:** DEFAULT 14 days back to `max_advance_days` ahead, with a "Load earlier" button (paged).
- **Performance:** one server query per range, server-rendered, plain buttons (no grid or chart library). Under 1 second on a weak connection.

**Square states (colour + icon + text label; never colour alone)**
| State | Look |
|---|---|
| Subscribed, upcoming | dim green outline with small tick |
| Taken (past, not skipped) | solid green with tick |
| Skipped | amber with skip icon and "+1" |
| Not subscribed | empty dark square with "+" (tap to add extra) |
| Extra | blue with tick |
| Mess closed | grey with closed icon |
| Upcoming but cutoff passed | green outline with a small lock |

**Tapping a square** (every square is a button, minimum 44 px) opens a **bottom sheet** with meal, date, time, state, and only the actions legal right now:
- **Skip this meal**, only before cutoff, with a live countdown ("Skip by 11:00 AM, 42 min left"); after cutoff replaced by "Locked: cutoff passed at 11:00 AM".
- **Undo skip** (before cutoff).
- **Add extra meal** on an empty square (uses a credit if available, else "Pay ₹X at the counter").
- Secondary: **Skip whole day**, **Mark holiday**.
- After any action: toast with confirmation, new credit balance, and a 10-second **Undo**. All mutations are POSTs with an `Idempotency-Key`.

### 6.4 One-tap skip (adoption-critical)
- PWA manifest **shortcuts**: "Skip next meal" → `/skip/next`, "Today" → `/today`. Install prompt after the first successful login.
- `/skip/next` opens the same sheet for the next skippable meal with one large **Skip** button. Mutation is a POST (never GET).
- Expired session on the shortcut: show only a PIN field with the Member ID remembered locally.

### 6.5 Other member pages
`/history` (attendance and credit ledger with reasons) · `/me` (plan, dues, payments, change PIN) (the calendar grid on `/today` replaces any separate week page).

---

## 7. Admin dashboard

Default view **today**, with a date picker and meal tabs. Everything is live; no email needed to view it.

**Per-meal cards (B / L / D):**
- **Coming (net)**: expected + extras (big number, the cook's figure).
- **Skipping**: count. **Tap → list** of skipping students: name, Member ID, phone, meal, time of request, holiday flag, credit balance. Searchable and exportable.
- **Extras** count. "Locked ✓" badge after cutoff with the locked snapshot and "+N late".

**Overview cards (each tappable to a list):**
- **Total students registered** (active).
- **Students away on holiday today.**
- **Students with credits** (balance > 0, with balances).
- **Students with upcoming dues:** either outstanding dues > 0, **or** an active subscription ending within `renewal_window_days` (CONFIGURABLE, DEFAULT 7) with no following subscription; tag the reason; oldest first.
- **Total outstanding dues.**

**Also:** plates-served variance, integrity mismatches, quick actions (mark holiday for a student, close a day, record payment).

---

## 8. Staff kitchen page (`/kitchen`)

For staff on a phone; auto-selects the current meal.
- Three groups: **Expected (serve)**, **Skipped (do not serve)**, **Extras**. Searchable. Final once cutoff passes. No push notification is needed.
- **Ate anyway** button on skipped students (§4.8).
- **Add walk-in** (§4.7). Ticking an already-skipped student requires confirmation and is flagged.
- **Plates served** entry per meal.
- Offline-tolerant: optimistic UI, retry queue, offline banner.

---

## 9. Admin panel pages

| Route | Purpose |
|---|---|
| `/admin` | Dashboard (§7) |
| `/admin/headcount` | Locked and live headcount, printable, WhatsApp share |
| `/admin/members`, `/admin/members/[id]` | Search, add, CSV import (with temp PIN list), deactivate. Member page: details, subscriptions, calendar, ledger, charges, payments, holidays; edit any entry or credit manually (audited) |
| `/admin/subscriptions` | Create/change plans (terms snapshot, amendments) |
| `/admin/attendance` | Pick date + meal; view/edit entries (legal transitions + audited override) |
| `/admin/holidays` | List, create, edit, cancel holidays |
| `/admin/credits` | Grant/deduct, month-end processing |
| `/admin/payments` | Record payments and reversals; **dues screen** (owed, oldest first); export |
| `/admin/closed-days` | Mark/unmark closed |
| `/admin/settings` | Every CONFIGURABLE value + meals CRUD |
| `/admin/staff` | Create staff/admin accounts |
| `/admin/audit` | Filterable audit log |
| `/admin/export` | CSV exports |

Every admin edit writes an `audit_log` row (before/after) and attendance edits can be **undone within 24 hours**.

Member routes: `/login`, `/forgot`, `/today`, `/skip/next`, `/history`, `/me`. Staff: `/kitchen`.
Cron route handlers (all require `CRON_SECRET`): `POST /api/cron/{generate-entries,persist-taken,lock-headcount,send-emails,integrity-check,end-subscriptions,expire-credits,keepalive}`.

---

## 10. Data model (Postgres)

Use migrations. **Enable RLS on every table with no public policies**; all access is server-side with the service role. **Triggers must block UPDATE and DELETE** on `credit_ledger`, `charges`, `payments`, `audit_log`. Never hard-delete members, subscriptions or entries (use status flags).

```sql
create extension if not exists pgcrypto;

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
-- seeds: timezone, mess_name, max_advance_days, max_holiday_days, renewal_window_days,
-- pin_length, admin_skip_notification ('instant'|'per_meal_digest'|'off'),
-- student_skip_email_enabled, admin_notify_emails (array), email_daily_cap,
-- email_digest_switch_percent (70), dues_policy, dues_limit, plates_variance_threshold,
-- defaults used only to pre-fill NEW subscriptions' terms: credit_scope, credit_policy,
-- rollover_cap, credit_expiry_days

create table meals (
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

create table members (
  id uuid primary key default gen_random_uuid(),
  member_code text unique not null,           -- e.g. CK-0042
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

create table subscriptions (
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
create index on subscriptions (member_id, status, start_date, end_date);

create table subscription_amendments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id),
  amended_by text not null,
  reason text not null,
  before jsonb not null,
  after jsonb not null,
  created_at timestamptz not null default now()
);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  start_date date not null,
  end_date date not null,
  meal_ids uuid[],                            -- null = all subscribed meals
  note text,
  created_by text not null,                   -- 'member' or admin user id
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table meal_entries (
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
create index on meal_entries (entry_date, meal_id, status);

create table credit_ledger (                  -- append-only
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
create index on credit_ledger (member_id);

create table charges (                        -- immutable
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

create table payments (                       -- immutable
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

create table closed_days (
  id uuid primary key default gen_random_uuid(),
  closed_date date not null,
  meal_id uuid references meals(id),          -- null = all meals
  reason text,
  unique (closed_date, meal_id)
);

create table meal_headcounts (
  entry_date date not null,
  meal_id uuid not null references meals(id),
  expected_count int not null,
  skipped_count int not null,
  extra_count int not null,
  late_changes int not null default 0,
  locked_at timestamptz not null default now(),
  primary key (entry_date, meal_id)
);

create table meal_service_counts (
  entry_date date not null,
  meal_id uuid not null references meals(id),
  plates_served int not null,
  entered_by text not null,
  updated_at timestamptz not null default now(),
  primary key (entry_date, meal_id)
);

create table pin_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  code_hash text not null,
  purpose text not null default 'reset' check (purpose in ('reset','setup')),
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  token_hash text not null,
  revoked_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table login_attempts (
  id bigserial primary key,
  member_id uuid,
  ip text,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index on login_attempts (ip, created_at);
create index on login_attempts (member_id, created_at);

create table idempotency_keys (
  key text primary key,
  member_id uuid,
  action text not null,
  response jsonb,
  created_at timestamptz not null default now()
);

create table email_outbox (
  id bigserial primary key,
  to_email text not null,
  template text not null,
  priority int not null,                       -- 1 highest
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','dropped')),
  attempts int not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table staff_profiles (
  user_id uuid primary key,                    -- Supabase auth user
  role text not null check (role in ('admin','staff')),
  display_name text
);

create table audit_log (                       -- append-only
  id bigserial primary key,
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
```

**Atomic operations** (skip, unskip, add/cancel extra, holiday create/cancel, close/reopen day, ate-anyway, record payment) are Postgres functions that lock the member row and perform the transition, ledger and charge writes in **one transaction**.

---

## 11. Email policy (few emails, protect the free quota)

All sending goes through `email_outbox` with priorities. The daily cap `email_daily_cap` (CONFIGURABLE, DEFAULT 90) is applied **highest priority first**. Failures retry up to 3 times. Items older than 48 hours that were never sent become `dropped`.

| Priority | To | Template | When |
|---|---|---|---|
| 1 | Student | `pin_reset_code`, `pin_changed`, `pin_setup` | Security and onboarding events, immediately |
| 2 | **Admin** | `skip_request_admin` | **Each skip request**, with student details: name, Member ID, phone, plan, meal(s) and date(s), time of request, credit balance. A "skip whole day" or a holiday is **one** email |
| 3 | Student | `skip_confirmation` | After their skip or holiday: what was skipped, credit added, new balance (optional via `student_skip_email_enabled`, DEFAULT on) |
| 4 | Student | `invite` | Optional invites after CSV import; lowest lane |

- `admin_skip_notification`: `instant` (**DEFAULT**) | `per_meal_digest` | `off`.
- **Quota protection:** if usage passes `email_digest_switch_percent` (DEFAULT 70%) of the daily cap, admin skip emails automatically switch to **one digest per meal at cutoff** for the rest of the day, and the dashboard shows a notice.
- No emails for flags, integrity mismatches, errors or "missed" meals (dashboard only).
- Templates: short plain text plus minimal HTML, mess name from settings.

---

## 12. Security checklist

- Service role key server-side only. RLS on, no public policies.
- Hash PINs, reset codes and session tokens. Never log secrets or PINs.
- Zod validation on all inputs. CSRF-safe mutations (POST + SameSite cookies).
- Generic error messages on login and reset (no user enumeration).
- Middleware protects admin/staff routes **and** each action re-checks the role.
- Soft-delete only; append-only ledger/charges/payments/audit enforced by DB triggers.
- **Privacy:** store only name, Member ID, phone, email, subscription and meal data, payments. **No photos.** Exports admin-only. Add a short privacy note on the login page footer and in the README (what is stored, who can see it, how to request deletion).

---

## 13. Scheduled jobs

| Job | Frequency | Behaviour |
|---|---|---|
| generate-entries | nightly (and on subscription create/edit) | Create `expected` rows `max_advance_days` ahead. Idempotent (`on conflict do nothing`). Skip closed days; respect plan end and ticket balance. **Reading never depends on this job** (§5) |
| persist-taken | hourly | Idempotent: mark past `expected` as `taken`; consume tickets |
| lock-headcount | every 5 min | Lock `meal_headcounts` for any meal past its cutoff; send admin digest if that mode is active |
| send-emails | every 5 min | Drain `email_outbox` by priority within the cap |
| integrity-check | nightly | Ledger vs entries per member |
| end-subscriptions | daily | Mark ended plans |
| expire-credits | daily | Only for `expire`-policy subscriptions |
| keepalive | daily | Trivial query so the free-tier DB never pauses |
| backup | daily (GitHub Actions) | §14 |

---

## 14. Backups and data safety

Free hosting is **not** a backup strategy.
- `.github/workflows/backup.yml`: daily `pg_dump` with `DATABASE_URL` (a GitHub secret), **encrypted** (age or gpg with a public key secret), stored as a private workflow artifact (30-day retention) and optionally copied to a second free location. A failed run notifies the repo owner via GitHub.
- README includes a **step-by-step restore procedure** and a **restore test checklist** (restore the latest dump into a fresh free Supabase project; verify counts of members, ledger rows and payments). The owner must run this once before go-live (it appears in `TODO.md`).
- CSV exports in admin as a secondary safeguard.

---

## 15. Design system and UX (follow this; you have freedom inside it)

### 15.1 Intent
A calm, quiet, content-first tool that feels like a well-made native iOS app: lots of whitespace, one clear action per screen, almost no decoration. It is used one-handed, in bright dining-hall light, often on weak mobile data. **Speed and clarity beat visual flourish.**

### 15.2 Freedom and hard rules
You (the IDE/agent) may choose exact layouts, component structure, icon choices, spacing details and fine-tune the hues below. Document every token in `DESIGN.md` and implement them as CSS variables. **The following are non-negotiable:**

**MUST**
- Minimalist: flat surfaces, hairline borders, generous whitespace, one accent colour.
- Apple-like clean typography using the **system font stack** (no web-font downloads), see §15.3.
- Warm, natural, non-"AI" colour palette, see §15.4.
- Mobile-first for students and staff; admin is desktop-first but fully usable on a phone.
- Light **and** dark mode via `prefers-color-scheme`, both tuned (not just inverted).
- Meet the performance budget in §15.8 and the accessibility rules in §15.9.

**MUST NOT**
- Purple, violet, indigo or blue-to-purple tones; neon; **any gradients**; glow effects; heavy drop shadows; glassmorphism or blur panels; sparkle/magic-wand/robot icons; emoji used as icons; decorative illustrations, stock images or hero banners; confetti or celebratory animations; chatbot-style UI or "AI" wording anywhere.
- Full-width coloured banners, pill-heavy "chip soup", or more than one accent colour on a screen.
- Marketing-style copy. Write short, plain, human sentences. Sentence case everywhere. Avoid exclamation marks.

### 15.3 Typography
- **Font stack (no downloads):** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif`. Do **not** load Google Fonts or any web font.
- Weights: 400 (body), 500 (labels, buttons), 600 (titles, key numbers). Avoid 700+.
- Suggested scale (px): Large title 32/38 · Title 24/30 · Headline 20/26 · Body 17/24 · Secondary 15/22 · Caption 13/18 · Micro 11/14 (use sparingly).
- Large titles use slight negative tracking (about -0.02em); body uses default. Numbers that change (counts, balances, clocks, dues) use `font-variant-numeric: tabular-nums`.
- Never use all-caps blocks or letter-spaced uppercase labels except for tiny column labels (B/L/D).
- Body text colour is near-black ink, secondary text a warm grey; never pure `#000` on pure `#fff`.

### 15.4 Colour (starting tokens; adjust hues slightly if needed, but keep the character)
Define as CSS variables with light and dark values. All text/background pairs must reach **WCAG AA**.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F6F4EF` | `#141311` | app background (warm paper / warm near-black) |
| `--surface` | `#FFFFFF` | `#1D1B18` | cards, sheets |
| `--surface-2` | `#EFECE5` | `#26231F` | subtle fills, empty squares |
| `--line` | `#E2DED4` | `#34302A` | hairlines (1px) |
| `--ink` | `#1C1B19` | `#F1EEE7` | primary text |
| `--ink-2` | `#6B665D` | `#A29D92` | secondary text |
| `--accent` | `#B4532A` (clay/terracotta) | `#D9784B` | primary buttons, links, today ring |
| `--ok` | `#3F7A4D` (sage/olive green) | `#5FA06D` | taken, success |
| `--ok-soft` | `#E3EEDF` | `#1F2D22` | upcoming tick tint |
| `--skip` | `#B7791F` (saffron/amber) | `#D4A24A` | skipped |
| `--skip-soft` | `#F5E8CC` | `#33291A` | skipped tint |
| `--extra` | `#2E6C70` (deep teal) | `#5AA3A8` | extra meal |
| `--closed` | `#9A958B` | `#6F6A60` | mess closed, disabled |
| `--danger` | `#B3382C` | `#E0675B` | errors, destructive |

Rules: one accent (`--accent`) for actions; status colours are only for meal states and messages. Use **soft tints plus a clear icon and text**, never colour alone. No gradients, ever.

### 15.5 Shape, spacing, depth, motion
- Spacing on a 4 px grid (4, 8, 12, 16, 24, 32, 48). Page padding 16 px mobile, 24+ desktop.
- Corner radii: meal squares 12, cards 16, buttons 12, sheets 20 (top corners), inputs 12.
- Depth: **hairline borders instead of shadows**; at most one very soft shadow on bottom sheets.
- Buttons: primary = solid `--accent` with white text; secondary = `--surface-2`; destructive = text in `--danger`. Minimum height 48 px, full width on mobile sheets.
- Motion: 120 to 200 ms ease-out; sheets slide up, tick states cross-fade. No skeleton shimmer, no spinners longer than needed; prefer optimistic updates. Respect `prefers-reduced-motion`.
- Icons: simple line icons (1.75 px stroke), few and consistent, inline SVG or tree-shaken lucide. No icon fonts.

### 15.6 Student dashboard (the key screen)
Follows §6.3 behaviour; visually:
- Header: the wordmark "Celebro Kitchen" in plain text (no logo graphic required) and a small account button. Beneath it, **four plain numerals** (Days left, Taken, Skipped, Credits) with small captions, not coloured pills. Credits shown in `--accent` only if greater than zero.
- Column labels B, L, D in micro type above the strip.
- Row: left column 56 px wide with weekday in secondary text and the date number in ink; today's date sits in an accent ring. Squares are **48 to 52 px**, radius 12, gap 8, fixed positions so the eye can scan down a column.
- Square fills: upcoming = `--ok-soft` with `--ok` hairline and small tick; taken = solid `--ok` with white tick; skipped = `--skip-soft` with `--skip` icon and "+1"; empty = `--surface-2` with a faint "+"; extra = `--extra` tint with tick; closed = `--surface-2` with a small closed icon and `--closed` stroke; locked = same as upcoming plus a tiny lock.
- Week headers are quiet text rows with a chevron; collapsed weeks show only the header and a one-line summary ("5 taken, 1 skipped").
- Bottom sheet: grabber, meal and date in Headline, one status line in Secondary, then at most two buttons. Cutoff countdown as plain text ("Skip until 11:00 AM, 42 min left"). Undo toast at the bottom, 10 seconds.
- First-run: one short line of help under the header ("Tap a meal to skip it."), dismissible, shown once.

### 15.7 Admin and staff screens
- Admin dashboard: three meal cards side by side on desktop (stacked on mobile), each with the **big tabular number** for "Coming", a smaller "Skipping" figure that is tappable, and a quiet "Locked" tag after cutoff. Overview figures below as a simple row of numbers with captions. No charts unless clearly useful.
- Tables: comfortable density, sticky header, hairline row separators, search at the top, no zebra striping, sorting by clicking headers, CSV export button at the end.
- Forms: one column, labels above inputs, inline validation, primary action at the bottom.
- `/kitchen`: very large text (17 to 20 px), three clearly separated groups, big tap targets, no clutter. Skipped group uses `--skip-soft` background with a plain "Do not serve" label.
- Empty, loading and error states: a single plain sentence, no illustrations.

### 15.8 Performance budget (enforce, and report numbers in `DECISIONS.md`)
- `/today` first-load JavaScript **≤ 100 KB gzipped**; admin pages as small as practical. LCP **< 1.5 s** on a throttled 4G mobile profile; CLS ≈ 0; TTI fast on low-end Android.
- **No web fonts, no images** other than PWA icons and favicon. Server-render by default; keep client components to the interactive sheet and form handlers; no client-side state library; no UI kit beyond a few copied, trimmed components.
- Query efficiency: one calendar query per student screen, indexes as in §10, no N+1.
- PWA: app shell cached; `theme-color` and `background_color` match `--bg`; icons are a simple monogram.
- Lighthouse mobile: Performance **≥ 95**, Accessibility **≥ 95**, Best Practices **≥ 95**.

### 15.9 Accessibility and inclusion
- AA contrast in both themes; visible 2 px focus ring in `--accent`; targets ≥ 44 px.
- Never rely on colour alone: every state also has an icon and a text label (visible in the sheet and as an `aria-label`, e.g. "Lunch, Wednesday 8, upcoming. Skip available until 11:00 AM").
- Full keyboard use for admin; semantic HTML; form labels; announced toasts (`aria-live="polite"`).
- All UI strings in one file so Hindi can be added later. Dates in the configured locale; times in 12-hour format by default (CONFIGURABLE).

### 15.10 Copy tone
Short, human, direct. Examples: "Skip lunch", "Skip until 11:00 AM, 42 min left", "Locked. The cut-off passed at 11:00 AM.", "Skipped. 1 credit added.", "Undo". No jokes, no emoji, no marketing phrases.

---

## 16. Defaults summary (change only via admin settings)

| Setting | Default |
|---|---|
| Timezone | Asia/Kolkata |
| Cutoff | 60 minutes before meal start (per meal) |
| Credits usable for | any meal |
| Credit policy | rollover, no cap |
| Skip window | 14 days ahead |
| Max holiday length | 30 days |
| PIN length | 5 digits |
| Renewal window ("upcoming dues") | 7 days |
| Admin skip notification | instant (digest after 70% of daily email cap) |
| Student skip confirmation email | on |
| Daily email cap | 90 |
| Dues policy | warn |

---

## 17. Build phases

1. **Foundation and admin:** migrations, seeds (3 meals, default settings), admin/staff auth, settings, meals CRUD, members CRUD + CSV import (temp PIN list), subscriptions with terms snapshot and amendments, charges/payments with reversals, dues screen, audit log, immutability triggers.
2. **Calendar and student dashboard:** `member_calendar` function (stored + virtual + effective status), member login and first-time PIN, `/forgot`, habit-grid dashboard with collapsible weeks, bottom sheet, skip/undo/extra, credit ledger with idempotency, `/history`, `/me`, PWA shortcuts and `/skip/next`.
3. **Holidays and closed days:** student and admin holidays (preview, cancel, past-dated admin), closed days, credit reversals.
4. **Admin dashboard and headcount:** per-meal cards, skipping lists, overview cards, headcount lock, printable page, WhatsApp share.
5. **Staff kitchen page:** serve/skip/extra lists, ate anyway, walk-ins, plates served.
6. **Jobs, email, backups, polish:** all cron routes, outbox and templates, backup workflow and restore doc, exports, Lighthouse pass, generate `README.md`, `DECISIONS.md` and **`TODO.md`** (§19).

---

## 18. Tests that must pass

**Time and status**
1. A past expected meal shows as `taken` immediately after `meal_end` with all cron jobs disabled.
2. A date with no stored rows appears as expected from the subscription; skipping it creates the row and exactly one credit.
3. Every transition not in §4.3 is rejected.
4. Cutoff checks use the DB clock (test with a skewed client clock).
5. Changing a meal's start time or cutoff in settings changes behaviour immediately, no redeploy.

**Skips, credits, idempotency**
6. Skip 61 min before start succeeds (+1 credit); at 59 min fails with no ledger row.
7. The same skip request twice (same `Idempotency-Key`) yields one credit; calling the skip function twice on the same state yields one credit (unique key blocks it).
8. Skip → undo → skip yields net +1 with three distinct keys.
9. Two simultaneous "extra with credit" requests with balance 1: exactly one succeeds.
10. Extra with credit creates no charge; extra without credit creates a charge at the snapshotted price. Cancel before cutoff refunds; after cutoff does not.
11. The integrity check flags a deliberately corrupted ledger row.
12. A skip and a staff "ate anyway" racing: exactly one outcome, no double credit effects.

**Plans and terms**
13. Monthly plan generates expected rows only for chosen meals and dates; overlapping subscriptions are rejected.
14. Ticket plan: skipped does not consume; taken does; at zero no new rows; no credits earned on ticket plans.
15. Changing global credit settings or a meal price does **not** alter existing subscriptions' terms; an amendment does, and is audited.

**Holidays and closures**
16. Holiday of 5 days × 3 meals: 15 skipped entries, +15 credits, **one** admin email, **one** student email; retry adds nothing.
17. A holiday whose first day includes an already-locked meal skips only meals before cutoff; the preview states which.
18. Cancelling the rest of a holiday returns only still-editable meals and reverses exactly those credits.
19. Admin past-dated holiday requires a note and grants credits once.
20. Closing a day gives each affected member exactly +1 per affected meal once; reopening reverses.

**Payments and ate-anyway**
21. Dues = charges − payments; status is derived; a reversal restores dues and leaves the original row untouched.
22. UPDATE/DELETE on ledger, charges, payments and audit_log is blocked by the database.
23. `dues_policy = block_extras` prevents a paid extra once dues exceed the limit.
24. "Ate anyway" with balance ≥ 1 removes one credit; with balance 0 creates a charge; running twice changes nothing more.

**Headcount and dashboard**
25. Headcount locks at cutoff; a later walk-in shows as a late change; the WhatsApp text matches locked figures.
26. Admin dashboard: coming = expected + extras per meal; the skipping list matches skipped entries; registered, credits and upcoming-dues cards match their definitions.
27. Student summary (days left, taken, skipped, credits, ticket meals left) matches underlying data for monthly and ticket plans.

**Auth and email**
28. Five wrong PINs lock the member 15 minutes; unknown ID and wrong PIN responses are identical.
29. Reset code is single-use, expires in 15 minutes, max 5 attempts, max 3 requests/hour; success revokes all sessions and sends "PIN changed".
30. When usage passes 70% of the daily cap, admin skip emails switch to one digest per meal; priority-1 emails are always sent first; stale low-priority items become `dropped`.

---

## 19. Mandatory deliverable: `TODO.md` for the owner

After the build is complete, **generate `TODO.md` at the repo root**. The reader is the mess owner, **not a developer**. Write in plain language, short steps, with checkboxes (`- [ ]`), numbered in the order to do them, with **exact commands, exact menu names and screens** based on what you actually built (no placeholders, no assumptions that the reader knows technical terms; explain each term briefly the first time). It must cover at least:

1. **Accounts to create (all free):** Supabase, GitHub, Cloudflare Pages or Netlify, Resend or Brevo. For each: what to click, what to copy.
2. **Database setup:** create the Supabase project, run migrations and seed, how to confirm it worked.
3. **Environment variables:** a table of each variable in `.env.example`, where to find the value, and where to paste it (hosting dashboard, GitHub secrets).
4. **Create the first admin and a staff account**, and how to log in.
5. **Email setup:** verify the sender address/domain, send a test email, explain the daily limit and the 70% digest switch.
6. **First configuration in `/admin/settings`:** meal names, times, durations, cutoffs, prices, timezone, admin notification email address(es), holiday limit, renewal window.
7. **Import members:** CSV format with a sample file, run the import, download the **temporary PIN list**, how to hand PINs out (printed slips), and what students do first (log in, change PIN).
8. **Create subscriptions** for imported members (or import them), and verify one student's dashboard.
9. **Scheduled jobs:** exactly how to enable and verify each job (pg_cron or GitHub Actions), including setting `CRON_SECRET`, and how to check they ran.
10. **Backups:** enable the GitHub backup workflow, add its secrets, run it once manually, **perform the restore test** once, and record the date.
11. **Deploy** the app, set the custom domain if any, and verify HTTPS.
12. **Generate the poster/QR for the app link** (a QR linking to the app's login page so students can open it, not an attendance scan), and instructions to install the PWA on a phone (Android and iPhone) with the "Skip next meal" shortcut.
13. **Staff training:** a 5-line guide for the cook and mess staff on using `/kitchen` (serve list, do-not-serve list, ate anyway, plates served) and `/admin/headcount` (print or share on WhatsApp).
14. **The five-student pilot:** each pilot student must install the app, skip a meal from the grid, mark a one-week holiday, undo a skip, and reset a PIN; a table to record confusion points; what to fix before opening to everyone.
15. **Go-live checklist:** a final list of things to verify the day before launch and the first week (headcount matches plates served, emails arriving, dues screen correct).
16. **Ongoing routine:** daily (check dashboard and headcount), weekly (check backup ran, review dues and plans ending), monthly (month-end credits per policy, renewals, check free-tier usage on Supabase, hosting and email dashboards).
17. **If something goes wrong:** how to restore from backup, how to reset a PIN, how to correct a wrong skip or payment (undo and reversals), who to contact.
18. **Known limits and when to upgrade:** free-tier limits (email per day, database size/pausing), Vercel/Netlify/Cloudflare terms note, and the fact that attendance is "expected, not scanned" (so the staff list and plates-served check are the safeguard); mention that scan-based attendance can be added later if abuse appears.

Make `TODO.md` accurate to the final repository: file names, route names, setting names and commands must match what exists. If you could not complete or verify something, list it under a "Needs attention" heading at the top with a clear explanation.

---

## 20. Definition of done

- All phases in §17 complete; all tests in §18 pass.
- No business value hardcoded; changes in `/admin/settings` take effect without redeploy.
- Free tiers only.
- `README.md`, `.env.example`, `DECISIONS.md`, `DESIGN.md` and **`TODO.md`** exist and are accurate.
- Design system of §15 implemented, tokens documented in `DESIGN.md`, light and dark themes both checked.
- Lighthouse mobile on `/today`: Performance, Accessibility and Best Practices each 95 or higher; first-load JS within budget.
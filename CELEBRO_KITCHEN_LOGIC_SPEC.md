# Celebro Kitchen: Meal Skip, Credit, "Missed" and Remaining-Days Logic

## 0. HOW TO USE THIS FILE (instructions to the AI agent / IDE)

This file defines the **exact business logic** for skipping, carry-forward credits, missed meals and remaining days. It **overrides** any conflicting logic in `CELEBRO_KITCHEN_BUILD_SPEC_FINAL.md` and anything you implemented before. Implement it **exactly**, with all of the rules in **one database layer** (Postgres functions), and have the UI only call those functions and display their results.

Do not invent rules. Do not add statuses. Do not compute these numbers in the browser. Prove each rule with the tests in §9 and paste the real test output.

---

## 1. Vocabulary (use these words and nothing else)

| Term | Meaning |
|---|---|
| **Slot** | One meal on one date for one member (e.g. Lunch on 12 Oct). |
| **Subscribed slot** | A slot whose meal is in the member's active subscription and whose date is inside the plan period. |
| **Cutoff** | `meal start time − cutoff_minutes` on that date (per meal, set by admin). Skipping is allowed only before it. |
| **Skip** | The member tells the system before the cutoff that they will not take that meal. Earns **+1 credit** (monthly plans). |
| **Taken** | A subscribed slot that was **not skipped** and whose meal has **ended**. It counts as consumed even if the person did not come. |
| **Credit** | One carried-forward meal. Generic: it can pay for any one meal. |
| **Extra** | A meal outside the subscription, bought with 1 credit or paid at the counter. |

### The three possible outcomes of a subscribed slot
There is **no "missed" status in the database**. A subscribed slot ends in exactly one of these ways:

| Outcome | What the member did | Stored status | Credit | Shown as |
|---|---|---|---|---|
| **Skipped in time** | Skipped before cutoff | `skipped` | **+1** | Amber, "+1" |
| **Taken** (including "missed" = did not skip and did not come) | Nothing, or ate normally | `expected` (becomes `taken` after the meal ends) | 0 | Green tick |
| **Mess closed** | Admin closed the day | `closed` | **+1** | Grey |

**"Missed" means: did not skip before the cutoff.** It is treated as taken and gives **no credit**. This is the penalty that makes timely skipping matter. There is no way for the system to know someone stayed away without informing, so it never tries. A *late request after the cutoff* is **refused** by the system. If the owner wants to be kind in a special case, the **admin** grants a credit manually (reason `admin_grant`, with a note, audited).

---

## 2. Core principles (non-negotiable)

1. **One source of truth for credits: the append-only `credit_ledger`.** Balance = `SUM(delta)`. **Never** store or update a balance column or counter.
2. **Credits belong to the member**, not to a subscription. They carry over to the next subscription automatically.
3. **All times use the database clock** (`now()`) and the timezone setting (DEFAULT `Asia/Kolkata`). Never the browser clock, never the app server clock.
4. **Every state change is a Postgres function** running in **one transaction** that locks the member row (`SELECT ... FOR UPDATE`). The UI never writes to tables directly.
5. **Idempotent**: repeating a request never gives a second credit. Each ledger row has a unique `idempotency_key`.
6. **Derived, not stored**, wherever possible: `taken`, days left, meals taken, balance are computed at read time, so they are always right even if every cron job is dead.
7. **Virtual rows**: if a subscribed slot has no row in `meal_entries`, treat it as `expected`. A skip on such a slot creates the row **inside the skip transaction**.

---

## 3. Skip logic

### 3.1 Skip a meal: `skip_meal(member_id, date, meal_id)`
Run as one transaction:

```
1. Lock the member row (FOR UPDATE).
2. Load the meal. Reject if it does not exist or is inactive.   → MEAL_NOT_FOUND
3. cutoff_ts = (date + meal.start_time) AT TIME ZONE tz − cutoff_minutes
   If now() >= cutoff_ts                                       → CUTOFF_PASSED
4. If date > today + max_advance_days                          → TOO_FAR_AHEAD
   If date < today                                             → IN_THE_PAST
5. Find the entry for (member, date, meal) FOR UPDATE.
   If none: find the active subscription covering that date that includes the meal.
            If none                                            → NOT_SUBSCRIBED
            Else INSERT the entry with status 'expected'.
6. If entry.is_extra                                           → use cancel_extra() instead
7. If entry.status = 'skipped'                                 → return OK (already skipped, idempotent, no new credit)
8. If entry.status <> 'expected'                               → INVALID_STATE
9. UPDATE meal_entries SET status='skipped', skip_count=skip_count+1, skipped_at=now()
   WHERE id=entry.id AND status='expected'   (conditional update)
   If 0 rows updated                                           → RACE_LOST
10. If the subscription plan_type = 'monthly':
      INSERT credit_ledger (member, +1, reason 'skip',
        idempotency_key = 'skip:' || entry.id || ':' || new skip_count)
      ON CONFLICT (idempotency_key) DO NOTHING
    If plan_type = 'ticket': no credit (a skipped meal simply does not use up a ticket).
11. Return { status, credits_balance, cutoff info }.
```

### 3.2 Undo a skip: `unskip_meal(member_id, date, meal_id)`
```
1. Lock member. Re-check cutoff exactly as above → CUTOFF_PASSED if now() >= cutoff_ts.
2. Entry must exist with status 'skipped'. If it is already 'expected' → return OK (idempotent).
3. Conditional UPDATE status='expected' WHERE status='skipped'.
4. If monthly: INSERT credit_ledger (member, −1, reason 'skip_reversed',
     idempotency_key = 'skip_reversed:' || entry.id || ':' || skip_count) ON CONFLICT DO NOTHING.
5. Return the new balance.
```
Skip → undo → skip again must give a net +1 with three distinct ledger keys (skip_count increases each time).

### 3.3 Skip a whole day and holidays
- **Skip whole day** and **holiday (date range)** call `skip_meal` for every subscribed slot in the range **inside one transaction**. Slots already past their cutoff are **left untouched and reported** ("2 meals were already locked").
- Return a preview first (`holiday_preview`): number of meals that will be skipped, number locked, credits that will be added. Then the confirm call performs it.
- One holiday record, one admin email, one student email.
- Cancel/shorten a holiday: for the remaining slots **still before cutoff**, run `unskip_meal`; locked ones stay skipped.

### 3.4 Mess closed day (admin)
For each subscribed `expected` slot on that date: set `closed`, insert **+1** credit (`closed:{entry_id}`, idempotent). Reopening: set back to `expected`, insert **−1** (`closed_reversed:{entry_id}`). Skipped slots on a closed day are not credited twice (a slot already `skipped` gets no extra credit; it stays skipped).

### 3.5 Errors shown to the user (exact messages)
| Code | Message |
|---|---|
| CUTOFF_PASSED | "Locked. The cut-off passed at {time}." |
| TOO_FAR_AHEAD | "You can skip up to {n} days ahead." |
| NOT_SUBSCRIBED | "This meal is not part of your plan. You can add it as an extra." |
| RACE_LOST / INVALID_STATE | "This meal was just updated. Refresh to see its status." |
Never swallow errors. Always show one of these on screen.

---

## 4. Carry-forward (credits)

### 4.1 Where credits come from and go
| Event | Delta | Reason | Key |
|---|---|---|---|
| Skip in time (monthly plan) | +1 | `skip` | `skip:{entry}:{n}` |
| Undo skip | −1 | `skip_reversed` | `skip_reversed:{entry}:{n}` |
| Mess closed | +1 | `mess_closed` | `closed:{entry}` |
| Closed day reopened | −1 | `mess_closed_reversed` | `closed_reversed:{entry}` |
| Extra meal paid with a credit | −1 | `extra_meal` | `extra_meal:{entry}:{m}` |
| Extra cancelled before cutoff | +1 | `extra_cancelled` | `extra_cancelled:{entry}:{m}` |
| "Ate anyway" with balance ≥ 1 | −1 | `ate_anyway` | `ate_anyway:{entry}:{n}` |
| Admin grant / deduct (note required) | ± | `admin_grant` / `admin_deduct` | `admin:{uuid}` |
| Admin holiday for past dates | +1 each | `admin_holiday` | `admin_holiday:{entry}:{n}` |
| Credits converted to extension days | −(days × meals per day) | `extension_used` | `extension:{subscription}:{n}` |
| Expiry (only if policy = expire) | −n | `expiry` | `expiry:{member}:{period}` |

### 4.2 Using credits
- **Extra meal** (before cutoff): if balance ≥ 1 → entry `is_extra=true, extra_payment='credit'`, −1 credit, **no charge**. If balance = 0 → entry `extra_payment='paid'` and a **charge** at the meal price (price snapshotted on the charge). Never let a **member action** drive the balance below zero.
- **Convert credits to extension days** (`extend_subscription`, used when the owner or member chooses at plan end, or when policy = `extend` and the admin confirms): see §6.

### 4.3 Carry-forward rules
- Credits **roll over** by default (policy `rollover`, no cap): they stay in the ledger across subscriptions and months.
- Policy `expire`: only credits older than `credit_expiry_days` are removed by a nightly job (ledger row `expiry`).
- Policy `extend`: the admin confirms a one-click conversion (§6). It is never done silently.

---

## 5. Remaining days and counts

All numbers below come from **one function**, `member_summary(member_id)`, computed at read time. The UI displays them as returned.

Let `today` = current date in the configured timezone. The member's **current subscription** is the active one covering `today` (if none, the one starting next; if none, show "No active plan").

**Helper:** `mpd` (meals per day) = number of meals in `subscription.meal_ids`.
**"Today is finished"** = `now()` is after the **end time of the last subscribed meal of today** (`start_time + duration_minutes`).

### 5.1 Monthly plan
```
plan_days_total  = end_date − start_date + 1
first_day_left  = today          if today is NOT finished
                = today + 1      if today IS finished
days_left        = max(0, end_date − first_day_left + 1)
days_gone        = plan_days_total − days_left        (calendar days used so far)
meals_taken      = count of subscribed slots with status expected/taken AND meal_end <= now()
meals_skipped    = count of subscribed slots with status skipped
meals_upcoming   = count of subscribed slots with status expected AND meal_end > now()
credits          = SUM(credit_ledger.delta) for the member
credit_days      = floor(credits / mpd)        (shown as "worth N days")
```
Show to the student: **Days left**, **Meals taken**, **Skipped**, **Credits** (and "worth N days" as small text if `credit_days > 0`).

### 5.2 Ticket plan (no end date)
```
meals_taken = count of subscribed slots with status expected/taken AND meal_end <= now()
meals_left  = meals_total − meals_taken            (never below 0)
days_left   = ceil(meals_left / mpd)               (an estimate, label it "about N days")
```
Skipped slots do not reduce `meals_left`. When `meals_left = 0` the plan is finished and no further virtual rows are created.
Only **upcoming, non-skipped** slots up to `meals_left` are shown as expected in the grid; later dates stay empty until the member has tickets left.

### 5.3 Reference SQL for the counts (adapt, do not simplify the logic)
```sql
-- slots = every subscribed meal on every date of the plan (stored or not)
with slots as (
  select d::date as entry_date, m.id as meal_id,
         ((d::date + m.start_time + make_interval(mins => m.duration_minutes))
            at time zone :tz) as meal_end
  from generate_series(:start_date::date,
                       least(coalesce(:end_date, :today + :max_advance_days), :today + :max_advance_days),
                       interval '1 day') d
  join meals m on m.id = any(:meal_ids)
),
joined as (
  select s.*, coalesce(e.status, 'expected') as status
  from slots s
  left join meal_entries e
    on e.member_id = :member and e.entry_date = s.entry_date and e.meal_id = s.meal_id
)
select
  count(*) filter (where status in ('expected','taken') and meal_end <= now()) as meals_taken,
  count(*) filter (where status = 'skipped')                                   as meals_skipped,
  count(*) filter (where status = 'expected' and meal_end >  now())            as meals_upcoming
from joined;
```
Notes: `closed` slots are in none of the three counts. Extras are **not** in `slots` (they are outside the plan); count them separately as `extras_taken` if you show them.

### 5.3a Calendar function
`member_calendar(member, from, to)` uses the same `slots + joined` idea to return one row per date × meal with `effective_status`:
```
closed   if status = 'closed'
skipped  if status = 'skipped'
upcoming if status in ('expected','taken') and now() <  meal_end
taken    if status in ('expected','taken') and now() >= meal_end
```
plus `is_extra`, `cutoff_ts`, `can_skip` (now() < cutoff_ts and status expected), `can_undo` (now() < cutoff_ts and status skipped). The grid renders from this and nothing else.

---

## 6. Extending a monthly plan with credits

`extend_subscription(member_id, subscription_id, days, actor)`, admin-confirmed (or member request that admin approves, whichever the UI offers; DEFAULT admin only):
```
1. Lock the member. Load the subscription (must be active or ended within the last 30 days).
2. cost = days × mpd.   If balance < cost → NOT_ENOUGH_CREDITS.
3. INSERT credit_ledger (−cost, 'extension_used', key 'extension:{sub}:{n}').
4. UPDATE subscription end_date = end_date + days (reactivate if ended).
5. INSERT subscription_amendments (who, why, before/after).
6. Generate entries for the new dates (skip closed days).
7. Insert an audit_log row. Return the new end_date and balance.
```
End dates are **never** changed any other way.

---

## 7. Worked examples (use these as tests)

Settings: lunch starts 12:00, cutoff 60 min → cutoff 11:00. Dinner 19:30 → cutoff 18:30. Today is Monday 12 Oct.

**A. Skip in time.** Asha (monthly, Lunch + Dinner). At 10:00 she skips Tuesday dinner. → status `skipped`, credits +1 (balance 1).
**B. Late request.** At 19:00 on Tuesday she tries to skip dinner. → `CUTOFF_PASSED`, no change. If she did not come, the slot stays "taken" and she gets no credit ("missed" meal).
**C. Use the credit.** On Wednesday she wants breakfast (not in her plan) at 06:00 and breakfast cutoff is 07:00. → extra with credit, balance 0, no charge.
**D. No credit.** On Thursday she adds another breakfast with balance 0. → extra paid, charge at the breakfast price, message "Pay ₹X at the counter".
**E. Undo.** She skips Friday lunch (+1), then undoes before 11:00 (−1). → balance unchanged; three ledger rows over skip/undo/skip give net +1.
**F. Holiday.** Mon 19 Oct to Fri 23 Oct, Lunch + Dinner, submitted on Mon 12 Oct. → 10 meals skipped, +10 credits, one holiday record.
**G. Partly locked holiday.** Submitted on Mon 19 Oct at 11:30 for Mon 19 to Wed 21. Lunch on the 19th is past cutoff. → 5 meals skipped (dinner 19th plus 4 more), 1 reported as locked, +5 credits.
**H. Days left.** Plan 1 Oct to 31 Oct, today 12 Oct at 14:00 and dinner still ahead → `days_left = 31 − 12 + 1 = 20`. At 21:30 (dinner ended) → `days_left = 19`.
**I. Ticket plan.** 30 tickets, Lunch only, 10 taken, 2 skipped → `meals_left = 20`, `days_left ≈ 20`. The 2 skipped slots did not use tickets and gave no credit.
**J. Closed day.** Admin closes Sunday for a festival. Every subscribed slot that day becomes `closed` and each member gets +1 per meal; members who had already skipped a slot that day get no extra credit for it.
**K. Extend.** Plan ends 31 Oct, mpd = 2, credits = 7 → `credit_days = 3`. Admin extends by 3 days → credits 1, end date 3 Nov.
**L. Double tap.** Two skip requests for the same slot within a second → one credit.

---

## 8. Frequent mistakes to avoid (check your code against this list)

1. Storing a "balance" or "remaining" number and updating it. → Always derive from the ledger and entries.
2. Adding a `missed` status or crediting someone after the cutoff. → Not allowed. Missed = taken, no credit.
3. Using the browser or server clock for the cutoff. → Database `now()` and the timezone setting only.
4. Counting only existing rows. → Include virtual (unstored) slots in all counts.
5. Counting skipped slots as taken. → Skipped is never taken.
6. Giving credits to ticket plans. → Tickets do not earn credits; skipping just does not consume a ticket.
7. Tying credits to one subscription. → Credits are per member and carry across plans.
8. Changing the end date outside `extend_subscription`.
9. Letting the UI do the math. → The UI only shows what `member_summary` and `member_calendar` return.
10. Creating a second credit on retry. → Unique `idempotency_key` plus the conditional status update.
11. Allowing a negative balance from a member action.
12. Forgetting to lock the member row, which allows two simultaneous requests to both succeed.

---

## 9. Tests that must pass (paste the real output)

| # | Test | Expected |
|---|---|---|
| 1 | Skip 61 min before start | OK, balance +1 |
| 2 | Skip 59 min before start | CUTOFF_PASSED, no ledger row |
| 3 | Same skip sent twice | one ledger row only |
| 4 | Skip, undo, skip | net +1, three distinct keys |
| 5 | Undo after cutoff | CUTOFF_PASSED, credit stays |
| 6 | Skip a slot with no stored row | row created, one credit |
| 7 | Skip a slot not in the plan | NOT_SUBSCRIBED |
| 8 | Skip on a ticket plan | status skipped, **no** credit, `meals_left` unchanged |
| 9 | Two simultaneous skips on one slot | one credit total |
| 10 | Extra with balance 1 | balance 0, no charge |
| 11 | Extra with balance 0 | charge at meal price |
| 12 | Two simultaneous extras with balance 1 | exactly one uses the credit |
| 13 | Holiday 5 days × 2 meals before cutoff | 10 skipped, +10, one record; repeating the call adds nothing |
| 14 | Holiday with first slot locked | locked slot excluded and reported |
| 15 | Cancel holiday | only still-editable slots restored and credits reversed exactly |
| 16 | Close a day then reopen | +1 per slot then −1 per slot, once each |
| 17 | Days left before and after the last meal of today ends | 20, then 19 (example H) |
| 18 | `meals_taken` with all cron jobs disabled | correct, derived at read time |
| 19 | Ticket plan with 30 tickets, 10 taken, 2 skipped | `meals_left = 20` |
| 20 | `extend_subscription` with enough credits / not enough | extends and deducts / NOT_ENOUGH_CREDITS |
| 21 | Cutoff with a client clock set 2 hours off | result follows the database clock |
| 22 | Integrity check | ledger sum equals skips + closures + admin grants − extras used − conversions |

Report format for each: test name, expected, actual, PASS/FAIL. Do not say "done" until all pass.

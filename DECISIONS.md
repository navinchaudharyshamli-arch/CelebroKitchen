# Key Technical & Architecture Decisions

1. **Meal Deactivation & Historical Subscriptions**:
   - Deactivating a meal in settings does not affect existing active subscriptions. They continue serving the snapshot of meal IDs specified in `terms.meals_snapshot` until the subscription ends.

2. **Ticket Plan Horizon & Skip Logic**:
   - Virtual/real expected meal rows are generated only while `(meals_taken + upcoming_expected_not_skipped) < meals_total`.
   - Skipping a meal on a ticket plan does not grant a credit ledger entry; it returns 1 available meal count to the remaining pool.

3. **Temporary PIN & Server-Side Enforcement**:
   - `must_change_pin` is stored on the member table and checked on the server for all protected API routes, server actions, and member pages (`/today`, `/skip/next`).
   - If true, all action attempts are blocked on the server and forced to the PIN change flow until updated.

4. **Immutability via DB Triggers**:
   - `credit_ledger`, `charges`, `payments`, and `audit_log` block `UPDATE` and `DELETE` operations via Postgres triggers. Adjustments/reversals are written as append-only records with negative/reversal references.

# HJS Recovery

Admin app for recovery work: **Stuck cases**, **Stuck dashboard**, **Collection**, and **Faulty** (coming soon).
It is a page of the delivery app: **`/?recovery`** (same repo, same build, same hosting — no separate upload).
Backend is Supabase (same project as delivery). Every call is a SECURITY DEFINER RPC that checks the admin access code (`rec_check`).

## Files

```
src/recovery/
  index.tsx           page entry (loaded only on /?recovery); adds its CSS + resets the delivery app's global styles
  App.tsx             login + sidebar/topbar shell + hash routing (#stuck, #stuck-dash, #collection, #faulty)
  api.ts              Supabase RPC helper; access code kept in sessionStorage "hjsRecovery.code"
  stuck/              Stuck cases list, dashboard, case drawer, notice letters, calc rules
  collection/         Collection list, payment calendar, salesperson view, promise drawer
supabase/
  recovery_01_stuck.sql        stuck tables + RPCs (already live)
  recovery_02_collection.sql   collection tables + RPCs (run once, after 01)
```

## Deploy

Push to GitHub → the delivery app deploys as usual → open `<delivery app URL>/?recovery`.
The Zoho LandingPage snippet just iframes that URL.

## Business rules (Stuck)

- **Unbilled (B)**: for each stuck invoice, rent accrues per day after a 30-day cycle — `round(monthly rent × days since (invoice date + 30) ÷ 30)`.
  "Cap unbilled at item value" limits B to the item value.
- **Total claim** = A billed not paid + B unbilled + C item value. Security deposit is shown but never added.
- **Notices**: Notice 1 (Reminder) is due as soon as a case is stuck. Notice 2 (Final) is due `gap2_days` after Notice 1.
  Letter wording uses `reply_days` (Notice 1) and `final_days` (Notice 2 deadline). All three are editable under "Notice timing".

## Business rules (Collection)

- One row per customer with Books pending > 0 (synced by n8n into `rec_upsert_collection`).
- A customer can have several promises (e.g. ₹4L pending → ₹2L promised on one date, the rest still open).
  Total open promises can never exceed the pending amount.
- When Books shows a payment, the sync applies it to open promises in date order. Amounts already marked
  "received" in the app are not counted twice.

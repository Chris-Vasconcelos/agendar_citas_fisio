# Security and data-integrity fix: verification checklist

Branch: `fix/security-data-integrity-20261029` (based on `refactor-app-architecture-15952622451304701325`).

## What changed
- Availability UPSERT targets the actual unique constraint `(user_id, day_of_week)`.
- Appointments cannot reference a patient belonging to another user when the migration is applied.
- Clinical hooks start empty in connected mode, clear on session change, and discard stale fetch responses when the session changes.
- New appointment forms no longer silently select the first patient.

## Before applying the migration
1. Back up the Supabase database using a secure admin workflow.
2. Inspect existing foreign-key constraints and duplicate constraint names, particularly if `schema.sql` has already been edited manually.
3. Apply `supabase/migrations/20261029_patient_ownership.sql` in a staging database first.
4. Run the owner-mismatch query included in the migration: an exception means data must be investigated rather than silently reassigned.
5. Do not re-run the migration after successful application; track it in your migrations history.

## Functional verification (staging, fake patient data only)
- Sign in as account A; load patients, appointments and availability.
- Sign out; ensure no clinical data remains on-screen, even when a previous request finishes late.
- Sign in as account B; confirm no A records appear.
- Create a new appointment; patient field must be empty until explicitly selected.
- Save a day schedule twice; it must update the existing row rather than insert a duplicate.
- With two accounts, attempt to assign an A patient to a B appointment; the DB must reject it.
- Schedule overlapping sessions in slots 1 and 2; a third overlapping session must be rejected.
- Verify mobile view and JSON backup import/export with **fictitious** data.

## Not yet solved
- Backup restoration remains non-atomic and needs a server-side transaction.
- Client-state clearing cannot substitute for RLS or same-user foreign keys; check production policies separately.
- These are code changes, **not** evidence of a live database test or a passing build.

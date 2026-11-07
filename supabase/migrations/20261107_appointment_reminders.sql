-- MINA: manual WhatsApp reminder history. Apply once using SQL Editor.
-- No provider credentials or patient message contents are stored.
BEGIN;
-- Required for the same-owner composite foreign key; id already has its own primary key.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_id_user_id_reminder_unique
  ON public.appointments (id, user_id);
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  appointment_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_start_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'opened' CHECK (status IN ('opened', 'confirmed_sent')),
  opened_at timestamptz,
  confirmed_at timestamptz,
  PRIMARY KEY (appointment_id, user_id),
  CONSTRAINT appointment_reminders_owner_fk
    FOREIGN KEY (appointment_id, user_id)
    REFERENCES public.appointments(id, user_id) ON DELETE CASCADE
);
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.appointment_reminders FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.appointment_reminders TO authenticated;
DROP POLICY IF EXISTS appointment_reminders_select_own ON public.appointment_reminders;
DROP POLICY IF EXISTS appointment_reminders_insert_own ON public.appointment_reminders;
DROP POLICY IF EXISTS appointment_reminders_update_own ON public.appointment_reminders;
CREATE POLICY appointment_reminders_select_own ON public.appointment_reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY appointment_reminders_insert_own ON public.appointment_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY appointment_reminders_update_own ON public.appointment_reminders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
COMMIT;

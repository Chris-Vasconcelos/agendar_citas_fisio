-- Apply to an EXISTING Supabase project only after a database backup.
-- If this fails, inspect cross-owner references before trying again.
BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    LEFT JOIN public.patients p ON p.id = a.patient_id AND p.user_id = a.user_id
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Appointments reference missing or other-owner patients; resolve first';
  END IF;
END $$;

ALTER TABLE public.patients
  ADD CONSTRAINT patients_id_user_unique UNIQUE (id, user_id);

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_patient_same_owner
  FOREIGN KEY (patient_id, user_id)
  REFERENCES public.patients (id, user_id)
  ON DELETE RESTRICT;
COMMIT;

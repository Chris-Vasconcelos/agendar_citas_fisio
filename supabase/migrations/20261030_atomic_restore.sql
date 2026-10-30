-- Atomic backup restore: apply in a staging project first.
-- Security INVOKER means all table RLS policies still apply to the caller.
CREATE OR REPLACE FUNCTION public.restore_clinical_backup(backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid := auth.uid();
  p record;
  a record;
  v record;
  patient_count integer;
  appointment_count integer;
  availability_count integer;
BEGIN
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF backup IS NULL OR jsonb_typeof(backup->'patients') <> 'array'
     OR jsonb_typeof(backup->'appointments') <> 'array'
     OR (backup ? 'availability' AND jsonb_typeof(backup->'availability') <> 'array') THEN
    RAISE EXCEPTION 'Invalid backup structure';
  END IF;

  patient_count := jsonb_array_length(backup->'patients');
  appointment_count := jsonb_array_length(backup->'appointments');
  availability_count := COALESCE(jsonb_array_length(backup->'availability'), 0);
  IF patient_count > 10000 OR appointment_count > 100000 OR availability_count > 7 THEN
    RAISE EXCEPTION 'Backup exceeds supported limits';
  END IF;

  FOR p IN SELECT * FROM jsonb_to_recordset(backup->'patients') AS x(
    id uuid, full_name text, age smallint, phone text, email text,
    allergies text, previous_studies text, family_history text,
    consultation_reason text, privacy_consent boolean, privacy_consent_at timestamptz
  ) LOOP
    IF p.id IS NULL THEN RAISE EXCEPTION 'Patient record without id'; END IF;
    INSERT INTO public.patients(
      id,user_id,full_name,age,phone,email,allergies,previous_studies,
      family_history,consultation_reason,privacy_consent,privacy_consent_at
    ) VALUES (
      p.id,owner_id,p.full_name,p.age,p.phone,p.email,
      COALESCE(p.allergies,'Ninguna conocida'),COALESCE(p.previous_studies,'Sin estudios previos'),
      COALESCE(p.family_history,'Sin antecedentes familiares registrados'),
      p.consultation_reason,p.privacy_consent,p.privacy_consent_at
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name=EXCLUDED.full_name,age=EXCLUDED.age,phone=EXCLUDED.phone,
      email=EXCLUDED.email,allergies=EXCLUDED.allergies,
      previous_studies=EXCLUDED.previous_studies,family_history=EXCLUDED.family_history,
      consultation_reason=EXCLUDED.consultation_reason,
      privacy_consent=EXCLUDED.privacy_consent,privacy_consent_at=EXCLUDED.privacy_consent_at;
  END LOOP;

  FOR a IN SELECT * FROM jsonb_to_recordset(backup->'appointments') AS x(
    id uuid, patient_id uuid, slot_number smallint, start_time timestamptz,
    end_time timestamptz, status text, patient_condition text,
    treatment_notes text, professional_name text
  ) LOOP
    IF a.id IS NULL OR a.patient_id IS NULL THEN
      RAISE EXCEPTION 'Appointment missing required identifiers';
    END IF;
    INSERT INTO public.appointments(
      id,user_id,patient_id,slot_number,start_time,end_time,status,
      patient_condition,treatment_notes,professional_name
    ) VALUES (
      a.id,owner_id,a.patient_id,a.slot_number,a.start_time,a.end_time,
      COALESCE(a.status,'scheduled'),COALESCE(a.patient_condition,''),
      COALESCE(a.treatment_notes,''),COALESCE(a.professional_name,'Lic. Ft. Eduardo')
    )
    ON CONFLICT (id) DO UPDATE SET
      patient_id=EXCLUDED.patient_id,slot_number=EXCLUDED.slot_number,
      start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,status=EXCLUDED.status,
      patient_condition=EXCLUDED.patient_condition,treatment_notes=EXCLUDED.treatment_notes,
      professional_name=EXCLUDED.professional_name;
  END LOOP;

  IF availability_count > 0 THEN
    FOR v IN SELECT * FROM jsonb_to_recordset(backup->'availability') AS x(
      day_of_week smallint,start_time time,end_time time,
      slot_duration_minutes smallint,is_active boolean
    ) LOOP
      INSERT INTO public.availability(
        user_id,day_of_week,start_time,end_time,slot_duration_minutes,is_active
      ) VALUES (
        owner_id,v.day_of_week,v.start_time,v.end_time,
        COALESCE(v.slot_duration_minutes,60),COALESCE(v.is_active,true)
      )
      ON CONFLICT (user_id,day_of_week) DO UPDATE SET
        start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,
        slot_duration_minutes=EXCLUDED.slot_duration_minutes,is_active=EXCLUDED.is_active;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'patients',patient_count,'appointments',appointment_count,
    'availability',availability_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.restore_clinical_backup(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.restore_clinical_backup(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.restore_clinical_backup(jsonb) TO authenticated;

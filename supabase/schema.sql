-- ============================================================================
-- SISTEMA DE GESTIÓN DE CITAS Y EXPEDIENTES CLÍNICOS DE FISIOTERAPIA (fisio-citas)
-- Normativa aplicable: LFPDPPP & NOM-004-SSA3-2012
-- Requisitos de Seguridad Verificables: REQ-SEC-01 a REQ-SEC-05
-- ============================================================================

-- 1. EXTENSIÓN PARA RESTRICCIÓN DE EXCLUSIÓN GIST CON RANGOS DE TIEMPO + UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. FUNCIÓN AUXILIAR PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TABLA 1: patients (Expediente Clínico y Consentimiento LFPDPPP Arts. 8 y 9)
-- Cumple REQ-SEC-01 (Validación estricta de tipos y rangos, ej. edad 0..120)
-- Cumple REQ-SEC-03 (privacy_consent boolean NOT NULL DEFAULT false con CHECK true)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) >= 3),
  age smallint NOT NULL CHECK (age >= 0 AND age <= 120),
  phone text NOT NULL CHECK (char_length(btrim(phone)) >= 7),
  email text CHECK (email IS NULL OR char_length(btrim(email)) >= 5),
  allergies text NOT NULL DEFAULT 'Ninguna conocida',
  previous_studies text NOT NULL DEFAULT 'Sin estudios previos',
  family_history text NOT NULL DEFAULT 'Sin antecedentes familiares registrados',
  consultation_reason text NOT NULL CHECK (char_length(btrim(consultation_reason)) >= 3),
  privacy_consent boolean NOT NULL DEFAULT false
    CONSTRAINT patients_privacy_consent_required CHECK (privacy_consent = true),
  privacy_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The composite key allows appointments to enforce same-owner patient references.
ALTER TABLE public.patients ADD CONSTRAINT patients_id_user_unique UNIQUE (id, user_id);

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients (user_id);

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLA 2: availability (Horario del Consultorio: L-V 08:00-19:00, Sáb 08:00-13:00)
-- day_of_week: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_duration_minutes smallint NOT NULL DEFAULT 60 CHECK (slot_duration_minutes BETWEEN 15 AND 240),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT availability_end_after_start CHECK (end_time > start_time),
  CONSTRAINT availability_unique_user_day UNIQUE (user_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_availability_user_id ON public.availability (user_id);

DROP TRIGGER IF EXISTS trg_availability_updated_at ON public.availability;
CREATE TRIGGER trg_availability_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- TABLA 3: appointments (Agenda de 2 Espacios Simultáneos + Nota de Evolución NOM-004)
-- Cumple REQ-SEC-04 (slot_number IN (1, 2) + EXCLUDE USING gist con tstzrange '[)')
-- Cumple NOM-004-SSA3-2012 Numerales 5.4 (ON DELETE RESTRICT), 6.1 y 6.2
-- (fecha, hora, estado del paciente, tratamiento aplicado e identificación profesional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL,
  CONSTRAINT appointments_patient_same_owner FOREIGN KEY (patient_id, user_id)
    REFERENCES public.patients(id, user_id) ON DELETE RESTRICT,
  slot_number smallint NOT NULL DEFAULT 1 CHECK (slot_number IN (1, 2)),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  patient_condition text NOT NULL DEFAULT '',
  treatment_notes text NOT NULL DEFAULT '',
  professional_name text NOT NULL DEFAULT 'Lic. Ft. Eduardo — Fisioterapia Deportiva',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- La hora de término debe ser estrictamente posterior a la hora de inicio
  CONSTRAINT appointments_end_after_start CHECK (end_time > start_time),

  -- REQ-SEC-04: Permite hasta 2 pacientes simultáneos (slot_number 1 y 2) por hora
  -- e impide un 3er registro encimado o duplicar el mismo espacio.
  -- Ignora las citas canceladas para liberar el espacio inmediatamente.
  CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
    user_id WITH =,
    slot_number WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_start
  ON public.appointments (user_id, start_time);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON public.appointments (patient_id);

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Cumple REQ-SEC-02 (Aislamiento Multitenant Estricto)
-- ============================================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Políticas para: patients
DROP POLICY IF EXISTS patients_select_own ON public.patients;
CREATE POLICY patients_select_own ON public.patients
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS patients_insert_own ON public.patients;
CREATE POLICY patients_insert_own ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS patients_update_own ON public.patients;
CREATE POLICY patients_update_own ON public.patients
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS patients_delete_own ON public.patients;
CREATE POLICY patients_delete_own ON public.patients
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para: availability
DROP POLICY IF EXISTS availability_select_own ON public.availability;
CREATE POLICY availability_select_own ON public.availability
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS availability_insert_own ON public.availability;
CREATE POLICY availability_insert_own ON public.availability
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS availability_update_own ON public.availability;
CREATE POLICY availability_update_own ON public.availability
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS availability_delete_own ON public.availability;
CREATE POLICY availability_delete_own ON public.availability
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Políticas para: appointments
DROP POLICY IF EXISTS appointments_select_own ON public.appointments;
CREATE POLICY appointments_select_own ON public.appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS appointments_insert_own ON public.appointments;
CREATE POLICY appointments_insert_own ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS appointments_update_own ON public.appointments;
CREATE POLICY appointments_update_own ON public.appointments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS appointments_delete_own ON public.appointments;
CREATE POLICY appointments_delete_own ON public.appointments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

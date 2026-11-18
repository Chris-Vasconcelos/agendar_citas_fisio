-- MINA LOCAL: esquema de referencia SQLite para prueba aislada (NO conectar a datos reales).
-- Se migrará a colecciones/hook de PocketBase si supera prueba de viabilidad.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL CHECK(length(trim(full_name)) >= 3),
  age INTEGER NOT NULL CHECK(age BETWEEN 0 AND 120),
  phone TEXT NOT NULL CHECK(length(trim(phone)) >= 7),
  email TEXT CHECK(email IS NULL OR length(trim(email)) >= 5),
  allergies TEXT NOT NULL DEFAULT 'Ninguna conocida',
  previous_studies TEXT NOT NULL DEFAULT 'Sin estudios previos',
  family_history TEXT NOT NULL DEFAULT 'Sin antecedentes familiares registrados',
  consultation_reason TEXT NOT NULL CHECK(length(trim(consultation_reason)) >= 3),
  privacy_consent INTEGER NOT NULL CHECK(privacy_consent = 1),
  privacy_consent_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(id, user_id)
);
CREATE TABLE availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK(slot_duration_minutes BETWEEN 15 AND 240),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  CHECK(start_time < end_time),
  UNIQUE(user_id, day_of_week)
);
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL,
  slot_number INTEGER NOT NULL CHECK(slot_number IN (1,2)),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK(status IN ('scheduled','completed','cancelled','no_show')),
  patient_condition TEXT NOT NULL DEFAULT '',
  treatment_notes TEXT NOT NULL DEFAULT '',
  professional_name TEXT NOT NULL DEFAULT 'Lic. Ft. Eduardo',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK(start_time < end_time),
  FOREIGN KEY (patient_id, user_id) REFERENCES patients(id, user_id) ON DELETE RESTRICT,
  UNIQUE(id,user_id)
);
CREATE INDEX idx_appointments_user_start ON appointments(user_id,start_time);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
-- Only canonical, fixed-width UTC ISO8601 timestamps are supported by this prototype.
-- App server MUST normalize UTC before persistence.
CREATE TRIGGER appointments_no_overlap_insert BEFORE INSERT ON appointments
WHEN NEW.status <> 'cancelled'
BEGIN
 SELECT RAISE(ABORT,'appointment_slot_overlap')
 WHERE EXISTS (
   SELECT 1 FROM appointments a
   WHERE a.user_id = NEW.user_id AND a.slot_number = NEW.slot_number
     AND a.status <> 'cancelled'
     AND NEW.start_time < a.end_time AND a.start_time < NEW.end_time
 );
 SELECT RAISE(ABORT,'appointment_patient_overlap')
 WHERE EXISTS (
   SELECT 1 FROM appointments a
   WHERE a.user_id = NEW.user_id AND a.patient_id = NEW.patient_id
     AND a.status <> 'cancelled'
     AND NEW.start_time < a.end_time AND a.start_time < NEW.end_time
 );
END;
CREATE TRIGGER appointments_no_overlap_update BEFORE UPDATE OF
  user_id,patient_id,slot_number,start_time,end_time,status ON appointments
WHEN NEW.status <> 'cancelled'
BEGIN
 SELECT RAISE(ABORT,'appointment_slot_overlap')
 WHERE EXISTS (
   SELECT 1 FROM appointments a
   WHERE a.id <> OLD.id AND a.user_id = NEW.user_id AND a.slot_number = NEW.slot_number
     AND a.status <> 'cancelled'
     AND NEW.start_time < a.end_time AND a.start_time < NEW.end_time
 );
 SELECT RAISE(ABORT,'appointment_patient_overlap')
 WHERE EXISTS (
   SELECT 1 FROM appointments a
   WHERE a.id <> OLD.id AND a.user_id = NEW.user_id AND a.patient_id = NEW.patient_id
     AND a.status <> 'cancelled'
     AND NEW.start_time < a.end_time AND a.start_time < NEW.end_time
 );
END;
CREATE TABLE patient_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL,
  relative_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK(content_type IN ('image/jpeg','image/png','image/webp')),
  file_size INTEGER NOT NULL CHECK(file_size BETWEEN 1 AND 8388608),
  document_type TEXT NOT NULL DEFAULT 'signed_consent' CHECK(document_type = 'signed_consent'),
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  uploaded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (patient_id,user_id) REFERENCES patients(id,user_id) ON DELETE RESTRICT
);
CREATE TABLE appointment_reminders (
  appointment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  appointment_start_time TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('opened','confirmed_sent')),
  opened_at TEXT,
  confirmed_at TEXT,
  PRIMARY KEY(appointment_id,user_id),
  FOREIGN KEY (appointment_id,user_id) REFERENCES appointments(id,user_id) ON DELETE CASCADE
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  event_time TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

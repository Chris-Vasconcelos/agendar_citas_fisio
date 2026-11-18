"""Prueba aislada de integridad SQLite, sin dependencias externas ni datos clínicos."""
import sqlite3
import pathlib
import tempfile
import unittest

SCHEMA = pathlib.Path(__file__).with_name("schema.sql").read_text(encoding="utf-8")
def sample_db():
    db = sqlite3.connect(":memory:")
    db.execute("PRAGMA foreign_keys=ON")
    db.executescript(SCHEMA)
    db.execute("INSERT INTO users(id,email,password_hash) VALUES ('u1','test@example.invalid','PLACEHOLDER_NOT_REAL')")
    db.execute("""INSERT INTO patients
      (id,user_id,full_name,age,phone,consultation_reason,privacy_consent)
      VALUES('p1','u1','Paciente Ficticio Uno',25,'7220000001','Prueba',1),
            ('p2','u1','Paciente Ficticio Dos',30,'7220000002','Prueba',1),
            ('p3','u1','Paciente Ficticio Tres',20,'7220000003','Prueba',1)""")
    return db

def appointment(db, id, patient, slot, start, end, status="scheduled"):
    db.execute("""INSERT INTO appointments
       (id,user_id,patient_id,slot_number,start_time,end_time,status)
       VALUES (?,?,?,?,?,?,?)""",(id,"u1",patient,slot,start,end,status))

class SchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = sample_db()
    def tearDown(self):
        self.db.close()
    def test_two_spaces_and_third_rejected(self):
        appointment(self.db,"a1","p1",1,"2026-11-09T15:00:00.000Z","2026-11-09T16:00:00.000Z")
        appointment(self.db,"a2","p2",2,"2026-11-09T15:00:00.000Z","2026-11-09T16:00:00.000Z")
        with self.assertRaisesRegex(sqlite3.IntegrityError,"appointment_slot_overlap"):
            appointment(self.db,"a3","p3",1,"2026-11-09T15:30:00.000Z","2026-11-09T16:30:00.000Z")
    def test_patient_cannot_occupy_both_spaces(self):
        appointment(self.db,"a1","p1",1,"2026-11-09T15:00:00.000Z","2026-11-09T16:00:00.000Z")
        with self.assertRaisesRegex(sqlite3.IntegrityError,"appointment_patient_overlap"):
            appointment(self.db,"a2","p1",2,"2026-11-09T15:15:00.000Z","2026-11-09T15:45:00.000Z")
    def test_adjacent_allowed_and_cancelled_releases_slot(self):
        appointment(self.db,"a1","p1",1,"2026-11-09T15:00:00.000Z","2026-11-09T16:00:00.000Z")
        appointment(self.db,"a2","p2",1,"2026-11-09T16:00:00.000Z","2026-11-09T17:00:00.000Z")
        self.db.execute("UPDATE appointments SET status='cancelled' WHERE id='a1'")
        appointment(self.db,"a3","p3",1,"2026-11-09T15:15:00.000Z","2026-11-09T15:45:00.000Z")
    def test_update_cannot_create_overlap(self):
        appointment(self.db,"a1","p1",1,"2026-11-09T15:00:00.000Z","2026-11-09T16:00:00.000Z")
        appointment(self.db,"a2","p2",2,"2026-11-09T15:00:00.000Z","2026-11-09T16:00:00.000Z")
        with self.assertRaisesRegex(sqlite3.IntegrityError,"appointment_slot_overlap"):
            self.db.execute("UPDATE appointments SET slot_number=1 WHERE id='a2'")
    def test_documents_protect_patient_from_deletion(self):
        self.db.execute("""INSERT INTO patient_documents
          (id,user_id,patient_id,relative_path,content_type,file_size,sha256)
          VALUES('d1','u1','p1','u1/p1/consent.jpg','image/jpeg',20,?)""",('a'*64,))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM patients WHERE id='p1'")
    def test_non_owner_patient_reference_rejected(self):
        self.db.execute("INSERT INTO users(id,email,password_hash) VALUES ('u2','other@example.invalid','x')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO appointments(id,user_id,patient_id,slot_number,start_time,end_time)
              VALUES('a1','u2','p1',1,'2026-11-09T15:00:00.000Z','2026-11-09T16:00:00.000Z')""")
    def test_schema_integrity(self):
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0],"ok")

if __name__ == "__main__":
    unittest.main()

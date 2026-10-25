# Marco Legal, Normativa Sanitaria (NOM-004-SSA3-2012 / LFPDPPP) y Arquitectura de Ciberseguridad

Este documento integra la auditoría legal, sanitaria y de ciberseguridad del sistema **fisio-citas** para el consultorio de fisioterapia en México.

---

## 1. Marco Regulatorio Aplicable en México

### 1.1. LFPDPPP (Ley Federal de Protección de Datos Personales en Posesión de los Particulares)
- **Datos Personales Sensibles (Art. 3, Fracc. VI):** Alergias, estudios previos, antecedentes familiares, motivo de consulta y notas de evolución son datos sensibles de salud.
- **Consentimiento Expreso (Arts. 8 y 9):** Implementado mediante la columna obligatoria `privacy_consent boolean NOT NULL DEFAULT false` con restricción `CHECK (privacy_consent = true)` en base de datos y validación obligatoria en el formulario antes de guardar.
- **Aviso de Privacidad y Derechos ARCO (Arts. 15, 16, 17 y 21):** La aplicación incorpora el texto del Aviso de Privacidad Integral del consultorio y la generación de resumen clínico para el titular.
- **Prevención de Fuga de Datos a Terceros:** Se desacopla el envío de datos clínicos a servicios externos como Google Calendar; toda la información reside únicamente en PostgreSQL/Supabase bajo control del Responsable.

### 1.2. NOM-004-SSA3-2012 (Del Expediente Clínico)
- **Conservación Mínima de 5 Años (Numeral 5.4):** Protección contra borrado accidental mediante `ON DELETE RESTRICT` entre citas y pacientes, más respaldos locales descargables (`backup_fisio_YYYYMMDD.json` y `.csv`).
- **Notas de Evolución por Sesión (Numerales 6.1 y 6.2):** Cada cita incluye fecha y hora (`start_time`, `end_time`), estado/evolución del paciente (`patient_condition`), descripción del tratamiento aplicado (`treatment_notes`) e identificación del profesional (`professional_name`).

---

## 2. Requisitos de Seguridad Verificables (REQ-SEC)

| ID | Requisito | Implementación en `schema.sql` y `src/` |
|---|---|---|
| **REQ-SEC-01** | Validación estricta en servidor y cliente | `CHECK (age >= 0 AND age <= 120)`, `CHECK (char_length(btrim(full_name)) >= 3)`, `CHECK (end_time > start_time)` en PostgreSQL + Constraint Validation API en React. |
| **REQ-SEC-02** | Aislamiento Multitenant mediante RLS | `ENABLE ROW LEVEL SECURITY` en todas las tablas con políticas explícitas `USING (auth.uid() = user_id)` y `WITH CHECK (auth.uid() = user_id)`. |
| **REQ-SEC-03** | Registro del Consentimiento de Privacidad | Columna `privacy_consent boolean NOT NULL DEFAULT false CHECK (privacy_consent = true)` en `patients` y bloqueo visual/lógico en el formulario si no se marca. |
| **REQ-SEC-04** | Restricción de Concurrencia de Espacios (Máx. 2 simultáneos) | `slot_number smallint NOT NULL DEFAULT 1 CHECK (slot_number IN (1, 2))` + `EXCLUDE USING gist (user_id WITH =, slot_number WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status <> 'cancelled')`. |
| **REQ-SEC-05** | Protección de Claves Privilegiadas | El cliente web únicamente utiliza `VITE_SUPABASE_ANON_KEY`; jamás expone `service_role`. |

---

## 3. Plan de Pruebas de Seguridad y Respaldo (TEST-01 a TEST-04)

1. **TEST-01 (RLS):** Consultar las tablas sin sesión activa o desde una cuenta distinta devuelve `0` registros gracias a `auth.uid() = user_id`.
2. **TEST-02 (Concurrencia):** Agendar Cita 1 (`09:00`, Espacio 1) y Cita 2 (`09:00`, Espacio 2) se guarda correctamente; intentar insertar Cita 3 a las `09:00` es rechazado por la restricción de exclusión GIST (`23P01`) y por el validador transaccional.
3. **TEST-03 (Consentimiento):** Intentar guardar un paciente sin marcar la casilla `privacy_consent` detiene el envío, marca el campo como inválido (`aria-invalid="true"`) y no inserta en la base de datos.
4. **TEST-04 (Restauración NOM-004):** Exportar `backup_fisio_YYYYMMDD.json`, eliminar un paciente de prueba sin citas (o limpiar datos de prueba) y restaurar desde el archivo `.json` recupera íntegramente `patients` $\to$ `appointments` mostrando el conteo exacto de filas restauradas.

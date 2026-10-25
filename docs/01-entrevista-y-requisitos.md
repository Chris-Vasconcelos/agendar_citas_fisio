# Fase 0: Entrevista con el Fisioterapeuta y Requisitos (MVP v1)

Antes de poner el sistema en producción con pacientes reales, confirma estos puntos con tu fisioterapeuta. Algunas decisiones técnicas de la base de datos dependen directamente de sus respuestas.

---

## 1. Preguntas clave para la entrevista

### A. Operación de la agenda y traslapes (Confirmado con Eduardo — 23/10/2026)
1. **¿Atiendes a un solo paciente a la vez o puede haber varios al mismo tiempo?**
   - **Respuesta confirmada:** *"Se atienden dos a la vez"* y *"Solo yo agendo paciente"*.
   - **Cómo se resolvió en la base de datos (`supabase/schema.sql`):** Se agregó la columna `slot_number smallint NOT NULL DEFAULT 1 CHECK (slot_number IN (1, 2))` (Espacio 1 y Espacio 2) y la restricción `EXCLUDE USING gist (user_id WITH =, slot_number WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status <> 'cancelled')`. Así puede agendar hasta **2 pacientes en el mismo horario**, pero la base de datos bloquea automáticamente un 3er traslape.
2. **¿Cuánto dura normalmente una sesión (ej. 45 min, 60 min) y dejas tiempo de limpieza entre pacientes?**
3. **¿Cuáles son tus días y horarios habituales de consulta?**
4. **¿Atiendes en un solo consultorio o en varios?**

### B. Problema actual con Google Calendar
5. **¿Qué es exactamente lo que te falla hoy con Google Calendar?**
   - ¿Agendas en el celular y no lo ves en la PC (o viceversa)?
   - ¿Se te enciman citas porque olvidas revisar algún calendario?
   - ¿Te cuesta llevar el control de quién canceló o no asistió?
6. **¿Usas un solo calendario en tu cuenta de Google o tienes varios (personal, consultorio, etc.)?**

### C. Privacidad y trato con pacientes
7. **¿Cuentas actualmente con un Aviso de Privacidad para tus pacientes?**
   - *Nota:* Aunque en esta versión v1 **no guardamos diagnósticos ni notas clínicas** (solo nombre, teléfono y correo opcional para agendar), recabar datos de contacto en un consultorio requiere informar al paciente sobre el uso de sus datos.
8. **En las notificaciones de Google Calendar en la pantalla bloqueada de tu celular, ¿prefieres que el evento muestre solo las iniciales del paciente (ej. `Cita Fisio - J. P.`) o su nombre completo?**
   - *Nota:* La aplicación incluye un interruptor para usar **solo iniciales** por defecto y proteger la privacidad del paciente frente a terceros que vean la pantalla del celular.

---

## 2. Alcance del MVP (Versión 1.0)

| Incluye en la v1 | Fuera de la v1 (para etapas posteriores) |
|---|---|
| Inicio de sesión con Google (Supabase Auth) | Portal público para que pacientes agenden solos |
| Directorio de pacientes (solo nombre, teléfono, correo) | Expediente clínico, diagnósticos o notas médicas |
| Crear, reprogramar, completar y cancelar citas | Sincronización automática en segundo plano vía Webhooks (`watch`) |
| Bloqueo de citas encimadas en base de datos (`tstzrange`) | Cobros en línea o envío automático por WhatsApp Business API |
| Creación/actualización/cancelación de evento en Google Calendar con zona horaria explícita (`timeZone`) e idempotencia al reintentar | Multi-camilla o múltiples fisioterapeutas en la misma cuenta |
| Detección de discrepancias con Google Calendar (avisa sin sobrescribir automáticamente) | |
| Botón visible **"Reconectar Google"** cuando caduque el token OAuth (`401`) | |

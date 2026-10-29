# Plan de Implementación Actualizado (Con Respuestas Reales de Eduardo)

Las respuestas de Eduardo cambian el proyecto para **mucho mejor**: simplifican la parte más frágil (Google Calendar) y dejan claro el verdadero valor por el que te pidió un programa.

---

## 1. Hallazgos clave de la entrevista

1. **¿Necesita seguir usando Google Calendar? → *"Si no es necesario, no"*:**
   - ¡Esta es la mejor noticia técnica del proyecto!
   - El único motivo por el que usaba Google Calendar era para anotar citas desde mensajes y verlas en su celular y PC.
   - Si tu aplicación web está conectada a **Supabase** con inicio de sesión normal (**Correo y Contraseña** de Supabase Auth), cualquier cita o nota que Eduardo guarde en su celular aparece **al instante** en su computadora y viceversa, **sin tokens de Google que caduquen cada 7 días, sin pantallas de advertencia de Google Cloud y sin desincronizaciones**.
   - Dejaremos un botón opcional *"Agregar a Google Calendar"* por si algún día lo quiere, pero **la app ya no depende de Google Calendar para funcionar al 100%**.

2. **El verdadero corazón del sistema: Agenda Doble + Ficha Clínica del Paciente:**
   - Eduardo atiende **15 a 20 pacientes diarios**, en sesiones de **60 minutos**, hasta **2 pacientes a la vez** (Espacio 1 y Espacio 2), de **Lunes a Viernes (08:00 a 19:00)** y **Sábados (08:00 a 13:00)**.
   - Necesita consultar y registrar los siguientes datos clínicos de cada paciente:
     - **Nombre** y **Edad** (más teléfono para contacto por WhatsApp).
     - **Alergias** (destacadas con alerta visual en color ámbar/rojo al abrir al paciente o su cita).
     - **Estudios previos** (radiografías, resonancias, ultrasonidos, etc.).
     - **Antecedentes familiares**.
     - **Motivo de consulta**.
     - **Descripción de lo que se le hizo** (nota de tratamiento/evolución registrada en cada sesión/cita).

---

## 2. Privacidad y Seguridad al guardar Datos de Salud

> [!IMPORTANT]
> Como ahora sí guardaremos antecedentes, alergias y descripción del tratamiento (que son **datos personales sensibles de salud** según la LFPDPPP en México):
> 1. **Cero envío de datos clínicos a terceros:** Al prescindir de Google Calendar (o mantenerlo desacoplado), ningún dato médico sale hacia calendarios externos ni notificaciones de pantalla bloqueada.
> 2. **Row Level Security (RLS) estricto + Autenticación por Correo/Contraseña:** Solo el usuario autenticado de Eduardo (`auth.uid() = user_id`) puede leer, insertar o actualizar sus pacientes y citas.
> 3. **Casilla de Aviso de Privacidad:** Agregaremos en el registro del paciente un check `privacy_consent` (*"El paciente fue informado del Aviso de Privacidad"*) y una vista/plantilla de Aviso de Privacidad lista para su consultorio.
> 4. **Botón de Respaldo Local (Exportar JSON/CSV):** Para que Eduardo pueda descargar una copia de seguridad de su base de datos en su computadora cuando quiera (cumpliendo la regla de respaldo periódico a costo $0).

---

## 3. Cambios Propuestos en Archivos

### Base de Datos (`supabase/schema.sql`)

#### [MODIFY] [schema.sql](file:///d:/fisio-citas/supabase/schema.sql)
1. **Tabla `patients` actualizada con los campos solicitados por Eduardo:**
   - `full_name text NOT NULL`
   - `age smallint CHECK (age IS NULL OR (age >= 0 AND age <= 120))`
   - `phone text` (opcional o recomendado para WhatsApp)
   - `allergies text` (*Alergias*)
   - `previous_studies text` (*Estudios previos*)
   - `family_history text` (*Antecedentes familiares*)
   - `consultation_reason text` (*Motivo de consulta*)
   - `privacy_consent boolean NOT NULL DEFAULT false`
2. **Tabla `appointments` actualizada:**
   - Conserva `slot_number smallint NOT NULL DEFAULT 1 CHECK (slot_number IN (1, 2))` y la restricción `EXCLUDE USING gist (user_id WITH =, slot_number WITH =, tstzrange(start_time, end_time, '[)') WITH &&) WHERE (status <> 'cancelled')`.
   - Agrega `treatment_notes text` (*"Descripción de lo que se le hizo"* en esa sesión).
3. **Horario predeterminado:**
   - Lunes a Viernes `08:00` a `19:00` (sesiones de `60` min) y Sábado `08:00` a `13:00`.

---

### Interfaz de Usuario (`src/App.jsx`)

#### [MODIFY] [App.jsx](file:///d:/fisio-citas/src/App.jsx)
1. **Vista de Agenda Diaria por Bloques de 60 min (08:00 a 19:00 L-V / 08:00 a 13:00 Sáb):**
   - Muestra claramente cada hora del día con sus **2 espacios (Espacio 1 y Espacio 2)** lado a lado en PC y apilados cómodamente en celular, para que de un vistazo vea qué horas tienen 0, 1 o 2 pacientes agendados.
   - En cada cita muestra alerta de **Alergias** (si el paciente tiene alguna), el **Motivo de consulta** y un botón rápido para anotar **"Lo que se le hizo"** en la sesión y marcarla como `Completada`.
2. **Expediente / Ficha Clínica del Paciente:**
   - Al tocar un paciente, abre su ficha completa con:
     - Nombre, Edad, Teléfono (con botón directo a WhatsApp).
     - Alergias, Estudios previos, Antecedentes familiares y Motivo de consulta.
     - **Historial cronológico de sesiones** mostrando la fecha y la *"Descripción de lo que se le hizo"* en cada cita.
3. **Autenticación simple (Correo + Contraseña en Supabase) + Respaldo:**
   - Pantalla de login por correo/contraseña cuando Supabase está conectado (sin obligarlo a lidiar con Google OAuth), más botón para **Exportar Respaldo (JSON/CSV)** de sus pacientes y citas.

---

## 4. Plan de Verificación

1. Ejecutar `npm run build` para verificar que no existan errores de compilación.
2. Comprobar que el horario predeterminado muestre Lunes–Viernes 08:00–19:00 y Sábado 08:00–13:00 con bloques de 60 minutos y 2 espacios por hora.
3. Verificar el flujo completo de crear paciente con sus 6 datos clínicos, agendar cita y registrar *"Descripción de lo que se le hizo"*.

# Guía de Configuración: Supabase, Google Cloud y Costos Operativos

Esta guía explica cómo configurar el backend en Supabase y la integración con Google Calendar API, así como las consideraciones reales sobre planes gratuitos y seguridad.

---

## 1. Consideraciones reales sobre costos y planes gratuitos

- **No prometas "$0/mes para siempre" en un contrato cerrado:** Aunque hoy Supabase, Vercel y Cloudflare Pages ofrecen planes gratuitos suficientes para un consultorio individual, los proveedores pueden modificar sus límites o condiciones en el futuro.
- **Límite de proyectos y cuentas por cliente:**
  - Si en el futuro entregas este sistema a otros fisioterapeutas, lo recomendable es que **cada cliente tenga su propia cuenta de Supabase y su propio proyecto de Google Cloud**.
  - Así evitas alcanzar el límite de proyectos gratuitos de tu cuenta personal de Supabase y el límite de 100 usuarios de prueba del proyecto OAuth en Google Cloud.
- **Pausa por inactividad en Supabase Free Tier:**
  - En el plan gratuito actual de Supabase, un proyecto puede pausarse si no registra actividad en la base de datos durante varios días (habitualmente 7 días de inactividad).
  - Si configuras un recordatorio o tarea programada (`ping`), asegúrate de que haga una consulta real a la base de datos (por ejemplo, un `SELECT` autenticado o `HEAD` a REST API de Supabase) y recuerda que GitHub Actions puede desactivar workflows programados si el repositorio no tiene commits en 60 días. Revisa siempre la documentación vigente de Supabase antes de entregar a producción.

---

## 2. Configurar Supabase

1. Crea un proyecto nuevo en [Supabase](https://supabase.com/).
2. Abre la sección **SQL Editor** en el menú izquierdo.
3. Copia todo el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y ejecútalo (**Run**).
4. En **Project Settings → API**, copia:
   - `Project URL` → será tu `VITE_SUPABASE_URL`
   - `anon public key` → será tu `VITE_SUPABASE_ANON_KEY`
5. Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`.

---

## 3. Configurar Google Cloud Console y OAuth

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) (idealmente con la cuenta del consultorio o la tuya para pruebas) y crea un proyecto.
2. Ve a **APIs y servicios → Biblioteca**, busca **Google Calendar API** y haz clic en **Habilitar**.
3. Ve a **Pantalla de consentimiento de OAuth** (Google Auth Platform):
   - Tipo de usuario: **Externo**.
   - Permisos (Scopes): agrega únicamente `https://www.googleapis.com/auth/calendar.events`.
   - **Usuarios de prueba (Test Users):** agrega el correo Gmail del fisioterapeuta.
   - **Importante sobre el modo de prueba vs. Producción:**
     - En modo **Testing**, los tokens de actualización caducan a los 7 días.
     - Como el permiso `calendar.events` es considerado sensible por Google, si pasas a **Producción** sin verificar la aplicación, Google mostrará al usuario una pantalla de advertencia (*"Google no ha verificado esta aplicación" → Configuración avanzada → Ir a la aplicación*). **Avísale de antemano a tu fisioterapeuta y muéstrale cómo aceptarla la primera vez para que no piense que es un error o un virus.**
4. Ve a **Credenciales → Crear credenciales → ID de cliente de OAuth** (Aplicación web):
   - En **URI de redireccionamiento autorizados**, pega la URL de callback que te da Supabase en **Authentication → Providers → Google** (`https://<tu-proyecto>.supabase.co/auth/v1/callback`).
5. Copia el **Client ID** y **Client Secret** y pégalos en **Supabase → Authentication → Providers → Google**.
6. En **Supabase → Authentication → URL Configuration**, asegúrate de incluir la URL de tu app local (`http://localhost:5173`) y la URL de producción en **Redirect URLs**.

---

## 4. Cómo maneja la aplicación los puntos críticos de Google Calendar

1. **Expiración del token de Google (`401 Unauthorized`):**
   - Supabase Auth mantiene tu sesión activa, pero **no renueva automáticamente el `provider_token` de Google**.
   - Cuando Google devuelve `401` (o si el token ya no está presente en la sesión), la cita se guarda de forma segura en Supabase con `sync_status = 'pending'` y la interfaz muestra un botón destacado **"Reconectar Google"** para renovar el permiso sin perder datos.
2. **Idempotencia al reintentar (evitar eventos duplicados):**
   - Al crear un evento en Google Calendar, la aplicación envía el `appointment.id` dentro de `extendedProperties.private.appointment_id` y también genera un identificador determinista válido en base32hex (`fisiocita` + UUID sin guiones).
   - Antes de crear un evento en un reintento, primero consulta si ya existe un evento en Google Calendar con `privateExtendedProperty=appointment_id=<uuid>`. Si ya se había creado (por ejemplo, si se cortó el internet justo después de crearlo), solo recupera su `google_event_id` y lo marca como `synced` en lugar de duplicarlo.
3. **Verificación sin sobrescritura automática:**
   - La base de datos de Supabase es la **única fuente de verdad**.
   - Al abrir la agenda o pulsar **"Verificar con Google"**, el sistema compara las citas activas con los eventos de Google Calendar. Si detecta que un evento fue movido o borrado directamente desde Google Calendar, **muestra una alerta de discrepancia** para que el fisioterapeuta decida si desea restaurar el horario original en Google o abrir la cita para editarla/cancelarla en la app.

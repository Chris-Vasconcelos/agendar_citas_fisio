# MINA — El valor del movimiento

Agenda clínica y expediente básico para un consultorio de fisioterapia. Proyecto en revisión; **no utilizar datos clínicos reales hasta verificar la seguridad de Supabase, el aviso de privacidad y los respaldos**.

## Tecnologías
React 19, Vite 6, Tailwind CSS 4, Supabase PostgreSQL/Auth. El modo localStorage se reserva para desarrollo y datos ficticios; un build de producción sin Supabase se bloquea.

## Desarrollo
1. Instala Node.js y ejecuta `npm ci`.
2. Copia `.env.example` a `.env` y configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. **No utilices ninguna clave service_role en el navegador**.
3. Ejecuta `npm run dev`.
4. Ejecuta `npm test` y `npm run build` antes de publicar.

Para pruebas locales sin credenciales, la app puede usar localStorage y datos de demostración. No uses esta modalidad con pacientes reales.

## Preparación de Supabase
- Revisa `supabase/schema.sql` en un entorno de pruebas antes de ejecutarlo. No vuelvas a aplicarlo en una base con datos sin plan de migración.
- Crea únicamente la cuenta autorizada del profesional y desactiva el registro público en el panel de Supabase Auth.
- Verifica en la base desplegada que RLS esté activo para `patients`, `appointments` y `availability`, y que los permisos estén limitados a `auth.uid() = user_id`.
- Comprueba que la clave pública sin sesión no pueda leer filas y prueba el aislamiento con dos usuarios ficticios.

## Publicación
Configura las variables VITE en el proveedor **antes de compilar**. Ejecuta pruebas, aplica las migraciones revisadas y despliega únicamente una rama aprobada. Nunca despliegues la rama de desarrollo sin revisar permisos, autenticación y backups.

## Seguridad y operación
- El repositorio no debe contener secretos, contraseñas, imágenes de pacientes ni datos clínicos reales.
- Los errores iniciales de red bloquean la Agenda para impedir interpretarlos como horarios libres.
- El almacenamiento local inválido no se sobreescribe automáticamente; recupera o respalda ese valor antes de continuar.
- Valida RLS directamente en Supabase y el procedimiento de respaldos/restauración antes de la entrega.
- Cambiar este repositorio a privado y proteger `main` requiere configuración de GitHub; no se hace automáticamente mediante esta documentación.

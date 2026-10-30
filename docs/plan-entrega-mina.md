# MINA — Entrega por etapas (rama de trabajo)

## Estado de desarrollo
1. **Sesiones y relaciones clínicas:** código preparado en PR #4; migración de propiedad pendiente de prueba en Supabase.
2. **Identificación de pacientes:** búsqueda tolerante a acentos, filtrado por nombre/teléfono/ID, resultados en bloques, advertencia y confirmación de duplicados. No se fusionan registros.
3. **Agenda:** conserva dos espacios y la restricción PostgreSQL anti-traslapes. Se requiere prueba real de concurrencia con dos clientes.
4. **Fotografía del consentimiento:** formulario integrado en el expediente, fotos JPG/PNG/WEBP de hasta 8 MB, metadatos y bucket privado. **No habilitado en BD hasta ejecutar migración y verificar RLS.**
5. **Respaldos:** interfaz usa RPC para restauración atómica. Requiere migración y prueba real antes de importar.
6. **Marca MINA:** título y encabezado actualizados y tema claro por defecto. Foto real pendiente; configurar `VITE_MINA_CONSULTORIO_PHOTO_URL` con imagen autorizada del consultorio.

## Aplicación de migraciones — NO ejecutar a ciegas
- Primero: respaldo de base de datos y revisión de restricciones actuales.
- En una base *staging* con usuarios y pacientes ficticios:
  - Si partimos de un esquema antiguo: `20261029_patient_ownership.sql`.
  - Después: `20261029_signed_consents.sql`.
  - Finalmente: `20261030_atomic_restore.sql`.
- Si se crea una base nueva con el `schema.sql` actualizado, la restricción de pertenencia ya viene en ese esquema: **no duplicar** esa migración.
- Probar las políticas con dos cuentas diferentes; la cuenta B jamás debe leer o editar expedientes/consentimientos de A.
- Probar uploads de imágenes válidas y archivos malformados; comprobar que los enlaces firmados caduquen.
- Probar restauración exitosa y fallida; ante un error no debe quedar ningún registro nuevo parcialmente restaurado.
- Probar en navegador de PC y cámara del móvil, solo con datos ficticios.

## Criterios de integración
- `npm test` y `npm run build` en CI.
- Citas simultáneas: 2 permitidas; tercera rechazada.
- Cerrar sesión: expediente y documentos inaccesibles inmediatamente.
- Búsqueda con >100 pacientes y homónimos.
- Carga del consentimiento en el expediente correcto, jamás en bucket público.
- Respaldo y recuperación completos confirmados en staging.
- Aprobación de Eduardo antes de producción.

**No implementar cambios de marca dependientes de una fotografía que aún no se haya proporcionado.**

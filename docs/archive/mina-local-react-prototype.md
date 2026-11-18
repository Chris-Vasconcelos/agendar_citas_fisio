> HISTORICO: no usar como instrucciones de instalacion ni como estado vigente. Ver ../mina-local-estado-integracion.md y ../mina-local-windows.md.

# MINA Local — prototipo React ↔ PocketBase

Esta rama contiene una **vista experimental separada de MINA** en `local-preview.html`. No sustituye las pantallas actuales ni conecta el sistema clínico completo. Su propósito es verificar por HTTP una sesión PocketBase, listado/registro de pacientes ficticios, alta/cancelación de citas y rechazo de empalmes por los triggers de SQLite.

**No abrirla en celulares ni por LAN**, porque Vite sirve por HTTP en `127.0.0.1` y este prototipo todavía carece del HTTPS aprobado para el consultorio. No utilizar expedientes, teléfonos ni fotografías reales.

## Ejecutar en equipo temporal de desarrollo

1. Tener instalado PocketBase **0.40.6** (binario temporal oficial). Arrancarlo en loopback con la migración del directorio `local/pocketbase/pb_migrations` y una base desechable.
2. Crear un operador ficticio mediante un superusuario solo para la prueba, sin habilitar registro público.
3. Ejecutar `npm install`, luego `npx vite --config vite.local.config.js`. Abrir `http://127.0.0.1:5173/local-preview.html`.
4. Probar dos citas con el mismo horario en espacios distintos, la tercera en un espacio ocupado y cancelaciones. No se admite guardar en navegador si falla el servidor.
5. La sesión se conserva solo en memoria; al actualizar se pierde intencionalmente. Los datos persisten únicamente en PocketBase.

## Antes de integrar en la interfaz clínica

- Extender la adaptación de tipos de datos y campos; no usar la vista de laboratorio como la versión definitiva.
- Conectar formularios reales y servicios, con manejo de errores que bloquee operaciones si el backend no responde.
- Desarrollar pruebas E2E y mecanismos robustos de sesión.
- Completar consentimientos privados, avisos de privacidad, copias cifradas/restauradas, HTTPS LAN, Windows 11 Home y preparación de mantenimiento.

**main y Supabase permanecen inalterados.** No realizar despliegue ni fusionar el PR antes de aprobar todas las compuertas.

# MINA Local — entrega de cambios locales al PR #30

Este documento describe el trabajo que antes solo existía en el entorno de desarrollo. La rama principal no se modifica ni se fusiona.

## Implementado

- Configuración separada `npm run dev:local` / `npm run build:local`, reutilizando la interfaz original.
- Servicios PocketBase para pacientes, archivo, citas, horarios, fotografías privadas y seguimiento manual de recordatorios.
- Sesión con token en sessionStorage (sin expedientes), validación contra auth-refresh, notificación de cierre y descarte de respuestas de sesiones anteriores.
- Bloqueo de nuevas escrituras cuando una respuesta de guardado se pierde; se exige recargar y comprobar antes de repetir.
- Migración adicional para fechas de creación, domingo como día cero, validación de horas y recordatorios. Mantiene la migración original.
- Bloqueo de importación JSON en la versión local: no simular restauración solo actualizando React.
- Pruebas de cliente, API real y navegador; workflow con Windows y Linux y preparación de paquete Windows x64.

## Continuación necesaria

Estos cambios no equivalen a proyecto listo para producción. Verificar el resultado de CI sobre este commit, completar los flujos del navegador que fallen y validar los scripts en Windows. Faltan HTTPS LAN, respaldo cifrado/restauración y ensayo sobre el equipo real. No incorporar datos clínicos hasta cerrar esas tareas.

Los documentos de etapa 1 y prototipo reflejan avances anteriores. Este archivo y el código del PR son la referencia para continuar la integración.

## Comandos de comprobación

```
npm ci
npm test
npm run build
npm run build:local
python scripts/get_pocketbase.py windows_amd64 tools-pb
python scripts/check_local.py tools-pb/pocketbase.exe --browser
```

La última orden requiere Chromium de Playwright en el entorno de desarrollo (`npx playwright install chromium`). Usa una base temporal y cuentas ficticias; nunca apunta a la instalación de Lalo.

## Continuacion: navegador comprobado (12 de noviembre de 2026)

Se reprodujo el fallo de CI de `734ffa9`: la prueba intentaba rellenar el motivo de consulta con la seccion clinica cerrada. Se corrigio el recorrido y se amplio, sin forzar elementos ocultos ni omitir comprobaciones.

Ejecutado en Linux con PocketBase 0.40.6 y Chromium Playwright: 10 pruebas API y el recorrido de la interfaz original aprobados. Este recorrido comprueba acceso, registro de paciente, fotografia privada, domingo 0 y persistencia de horarios, conflicto entre dos sesiones independientes, seguimiento manual de WhatsApp (destino interceptado, sin enviar mensajes), notas clinicas, archivo con historial conservado, recarga, ausencia de expedientes en almacenamiento del navegador, bloqueo ante servidor inaccesible y cierre de sesion. Los controles de horarios se bloquean mientras se confirma un guardado para evitar escrituras superpuestas.

Esto no valida el equipo Windows del consultorio, su telefono ni HTTPS en su red. Las comprobaciones Windows se distinguen en CI; no asumirlas aprobadas a partir de Linux.

## Verificación al publicar (12 de noviembre de 2026)

Aprobadas: 29 pruebas Node, 10 pruebas API PocketBase 0.40.6, compilación habitual y compilación local. La prueba automatizada de navegador no llegó a ejecutarse: Chromium se cerró al iniciar por `socket() failed: Operation not permitted` en este entorno. No se declara aprobada. Windows y generación del paquete quedan pendientes de la ejecución de GitHub Actions y del equipo real.

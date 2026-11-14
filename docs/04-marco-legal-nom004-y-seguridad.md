# Requisitos de seguridad y revision del expediente

Los expedientes, antecedentes y fotografias contienen datos sensibles. La referencia normativa del proyecto se conserva en `marco-legal-y-seguridad-fisio.pdf` y en el archivo historico. Este documento describe controles tecnicos; las pruebas no certifican por si solas cumplimiento legal. El responsable debe revisar campos, consentimientos, aviso de privacidad y plazos de conservacion antes del uso real.

| Control | Implementacion local y comprobacion |
|---|---|
| Acceso | Operadores autenticados; altas de cuentas administradas por superusuario local, sin registro publico. |
| Aislamiento | Reglas PocketBase por propietario y relaciones del paciente; pruebas con dos operadores ficticios. Estado de pantalla por generacion de sesion. |
| Integridad de agenda | Migraciones PocketBase y triggers SQLite para espacios/paciente; pruebas de concurrencia reales. |
| Fotografias | Archivos protegidos, autorizacion y token temporal; JPG/PNG/WebP, firma de formato y limite de 8 MB en cliente. |
| Retencion | Archivar expedientes, conservar citas y documentos. No sustituir la politica de conservacion por exportaciones parciales. |
| Recuperacion | Copia completa autenticada/cifrada con age, verificacion de todos los archivos y restauracion separada; probar tambien fuera del equipo original. |
| Equipo y red | Cuentas Windows protegidas, disco cifrado, copias externas, red privada y HTTPS si se utiliza otro dispositivo. Pendiente comprobar el consultorio real. |

No guardar expedientes como alternativa en almacenamiento del navegador. El cierre o cambio de cuenta invalida la vista anterior y sus callbacks. Un fallo del servidor debe bloquear la carga y un guardado incierto debe exigir revision antes de repetir.

Para evidencias y pendientes, ver [estado vigente](mina-local-estado-integracion.md) y [operacion Windows](mina-local-windows.md). Las formulaciones de la implementacion anterior se conservan solo como [historial](archive/04-marco-legal-nom004-y-seguridad.md).

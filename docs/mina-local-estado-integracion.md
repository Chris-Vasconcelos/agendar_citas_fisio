# MINA Local — estado real y relevo del PR #30

Rama de trabajo: `feat/mina-local-etapa1-20261108`. No fusionar ni cambiar `main`. Destino: PC Windows del consultorio de Lalo; edicion, arquitectura y telefono pendientes de confirmar. Los documentos de etapa 1 y prototipo describen estados historicos; este documento, el codigo y los resultados de CI son la referencia actual.

## Implementado

- Compilacion `npm run build:local` con la interfaz original y servicios PocketBase para acceso, pacientes/archivo, agenda, horarios, notas clinicas, fotografias privadas y seguimiento **manual** de WhatsApp. La compilacion habitual conserva Supabase.
- Token de sesion en sessionStorage, sin expedientes; validacion contra auth-refresh, vencimiento/cierre y descarte de respuestas anteriores al cambio de sesion.
- Fallos de carga bloquean la vista; no muestran una agenda vacia como si hubiera cargado. No existe respaldo de expedientes en almacenamiento del navegador. Guardados sin respuesta confirmada bloquean nuevas escrituras hasta recargar y revisar.
- Migracion aditiva para fechas, domingo 0, validacion de horas y recordatorios. Triggers del servidor rechazan conflictos concurrentes. Los controles de horarios se bloquean durante su guardado.
- Paquete Windows x64 con PocketBase 0.40.6, age 1.2.1, Caddy 2.10.2, migraciones, version de codigo, interfaz y scripts PowerShell. No requiere Docker, Node ni Python en el consultorio.
- Arranque/detencion de procesos, inicio al entrar en la cuenta Windows (no antes del inicio de sesion), configuracion opcional de HTTPS en IPv4 privada y regla de firewall restringida. El proxy bloquea panel/API administrativos y no instala confianza en telefonos automaticamente.
- Respaldo completo cifrado con age: base detenida, fotografias, configuracion, migraciones y CA privada de HTTPS. Identidad de recuperacion cifrada con frase, destinatario publico en la PC. Restauracion en carpeta nueva, autenticacion del cifrado y verificacion SHA256 de todos los archivos antes de publicar. No reemplaza la base activa. Exportacion CSV/JSON sigue siendo parcial y no restaura el servidor.

## Pruebas ejecutadas

En este entorno Linux: pruebas Node, 7 pruebas SQLite, ambas compilaciones, 10 pruebas de API PocketBase real y recorrido Chromium de la interfaz original aprobados. El recorrido verifica paciente, fotografia privada, domingo y persistencia de horarios, conflicto entre dos sesiones, seguimiento manual de WhatsApp sin enviar mensajes, notas, archivo con historial conservado, recarga, ausencia de expedientes en almacenamiento del navegador, servidor inaccesible y cierre de sesion.

Respaldo probado con PowerShell 7.4.6 y base PocketBase temporal real: coincidencia de todos los archivos, servidor recuperado arrancado, acceso del operador original, pacientes, fotografia privada y nota clinica. Rechazo de clave incorrecta, archivo alterado, destino existente, copia dentro de los datos y base abierta. Tambien se probo de forma interactiva preparar una identidad cifrada y descifrar con ella usando una frase ficticia.

HTTPS probado con CA temporal sin deshabilitar TLS: confianza explicita y validacion de IP, rechazo sin confiar en la CA, interfaz original, acceso por operador, fotografia privada y bloqueo administrativo. Se rechazan IP publicas, escucha general e inyeccion en la configuracion.

CI del commit `8e7b9cd` aprobado en Linux y Windows: API, navegador, HTTPS con CA/IP verificadas, SQLite, ambas compilaciones y respaldo/restauracion. En Windows PowerShell 5.1 tambien se comprobo paquete en ruta con espacios, inicio repetido sin duplicacion, proxy HTTPS, interfaz original, detencion, respaldo/restauracion y registro de tarea al iniciar sesion con privilegios limitados (retirada al terminar la prueba). Esto no prueba el reinicio de la PC real. Ejecucion: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43307232911 . Paquete x64 publicado por esa ejecucion: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43307232911/artifacts/13983029564 . El artefacto de Actions se conserva 14 dias; guardar el ZIP de la version evaluada antes de su vencimiento.

## Comandos de desarrollo

```shell
npm ci
npm test
npm run build
npm run build:local
npx playwright install chromium
python scripts/get_pocketbase.py linux_amd64 tools-pb
python scripts/get_age.py linux-amd64 tools-age
python scripts/get_caddy.py linux_amd64 tools-caddy
MINA_TEST_AGE_DIR=tools-age MINA_TEST_CADDY=tools-caddy/caddy python scripts/check_local.py tools-pb/pocketbase --browser --backup --https
python -m unittest discover -s local/spike -p 'test_*.py' -v
```

Requiere PowerShell en el entorno de desarrollo (`pwsh`, o ruta en `MINA_TEST_PWSH`). En Windows usar las descargas `windows_amd64` para PocketBase/Caddy, `windows-amd64` para age, ejecutables `.exe` y variables `$env:MINA_TEST_AGE_DIR`/`$env:MINA_TEST_CADDY`. Todas estas pruebas usan bases temporales y datos ficticios; no apuntar a la instalacion de Lalo.

`python scripts/package_windows.py` construye `local-release/MINA-Local-Windows-x64.zip`. CI publica el ZIP solo despues de pasar las pruebas Windows, incluida compatibilidad PowerShell 5.1 del paquete y registro de tarea de inicio. No implica que se haya instalado en el consultorio.

## Pendiente imprescindible en el equipo real

1. Confirmar edicion/arquitectura Windows y sistema del telefono; el paquete actual es x64.
2. Verificar arranque tras inicio de sesion/reinicio, recuperacion de energia, UPS y disponibilidad real de la PC.
3. Reservar IP en router, red interna, firewall privado, instalar/verificar CA en telefono y comprobar HTTPS sin advertencias, citas simultaneas y fotografias desde ambos dispositivos.
4. Verificar cifrado del disco Windows, cuentas/permisos y custodia de clave/frase. El respaldo utiliza temporales sin cifrar en el directorio de datos, que se eliminan ante errores normales; no promete borrado fisico.
5. Probar copia al disco externo y restauracion en otro equipo, incluidas fotos y CA; conservar el paquete de la version de cada respaldo y una segunda copia desconectada. El respaldo es manual y tiene limite de 20 GB descomprimidos.
6. Acordar responsable de mantenimiento, actualizaciones, custodia y frecuencia de pruebas de recuperacion. No migrar expedientes clinicos ni retirar el sistema previo hasta completar estas comprobaciones.

Procedimiento de instalacion, HTTPS y respaldo: `docs/mina-local-windows.md`. No declarar terminado el proyecto por compilar o por pasar CI: las comprobaciones del consultorio siguen pendientes.

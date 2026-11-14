# MINA Local — estado real y relevo del PR #30

Rama de trabajo: `feat/mina-local-etapa1-20261108`. No fusionar ni cambiar `main`. Destino: PC Windows del consultorio de Lalo; Windows 11 Pro Education x64 confirmado; iPhone disponible, uso inicial pendiente de confirmar. Los documentos de la version anterior y de los prototipos se encuentran en `docs/archive`; este documento, el codigo y los resultados de CI son la referencia actual.

## Version candidata: instalacion y sesion

Implementado sobre esta rama, sujeto a las comprobaciones indicadas abajo: instalador nativo por usuario (`Instalar-MINA.exe`), iniciador `MINA.exe`, accesos MINA/Comprobar MINA y arranque al entrar en Windows. La ubicacion estable es `%LOCALAPPDATA%\MINA-Local\app`; la base existente permanece en `%LOCALAPPDATA%\MINA-Local\pb_data`. El instalador conserva cuentas/datos, verifica archivos, detiene solo procesos identificados de esa base y guarda una copia local previa al actualizar. Esa copia local sin cifrar NO sustituye el respaldo externo cifrado.

El asistente crea/verifica responsable y cuenta cotidiana sin abrir el panel del servidor. En instalaciones existentes prioriza entrar con la cuenta actual. La ventana propia usa Edge/Chrome con perfil separado, sin barra de direcciones en el flujo normal. No instala ni cambia politicas globales PowerShell; como ejecutable aun sin firma de editor, Windows puede solicitar comprobar procedencia/reputacion. No desactivar antivirus ni politicas para ejecutarlo.

Sesion: recordar equipo es opcional, token/metadatos sin expedientes ni contraseñas en localStorage, validacion del servidor al reabrir, jornada maxima de ocho horas y bloqueo tras diez minutos sin actividad. El token del operador tambien se limita a ocho horas con una migracion adicional. El bloqueo oculta/inactiva la pantalla, bloquea nuevas consultas del cliente y cierra fotografias abiertas por MINA; conserva formularios en memoria. Desbloquear requiere contraseña de la misma cuenta. No sustituye el bloqueo de Windows ni protege frente a quien tenga control de esa cuenta/sus archivos. Cerrar sesion limpia almacenamiento y avisa a otras ventanas del mismo perfil.

Candidata verificada sobre `6ea8bc0e2a0e5c1bed6b1eeaea834a095c946521` el 14 de noviembre de 2026. CI aprobada en Windows y Linux: 32 pruebas Node, 11 API, SQLite, ambas compilaciones, navegador real (recordar/reabrir, bloqueo manual/inactivo, contraseña incorrecta, captura conservada, aislamiento entre cuentas y cierre entre ventanas), HTTPS y respaldo/restauracion con datos ficticios. Windows tambien aprobo compilacion .NET Framework, compatibilidad PowerShell 5.1 y prueba nativa de instalacion, controles del asistente, contraseñas enmascaradas, cuentas sin dashboard, accesos, apertura repetida, ventana app/perfil separado, actualizacion con datos conservados, copia previa, retirada del inicio antiguo, diagnostico sin secretos y rechazo de procesos ajenos/archivos alterados. La prueba del reinicio real del consultorio sigue pendiente.

Ejecucion: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43587118129 . Paquete con `Instalar-MINA.exe`, SHA-256 y ZIP de soporte: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43587118129/artifacts/14110424945 . Guardar el artefacto antes de su vencimiento (28 de noviembre de 2026). SHA-256 del instalador: `81eeb3d2bb37c601b9b55388272644a8878f9349fe54a983623306b54317d0f3`. Es una candidata probada en CI, no una aceptacion del uso clinico.

## Implementado

- Compilacion `npm run build:local` con la interfaz original y servicios PocketBase para acceso, pacientes/archivo, agenda, horarios, notas clinicas, fotografias privadas y seguimiento **manual** de WhatsApp. Todos los comandos de desarrollo y compilacion seleccionan ahora exclusivamente PocketBase local.
- Token de sesion en sessionStorage, sin expedientes; validacion contra auth-refresh, vencimiento/cierre y descarte de respuestas anteriores al cambio de sesion.
- Fallos de carga bloquean la vista; no muestran una agenda vacia como si hubiera cargado. No existe respaldo de expedientes en almacenamiento del navegador. Guardados sin respuesta confirmada bloquean nuevas escrituras hasta recargar y revisar.
- Migracion aditiva para fechas, domingo 0, validacion de horas y recordatorios. Triggers del servidor rechazan conflictos concurrentes. Los controles de horarios se bloquean durante su guardado.
- Paquete Windows x64 con PocketBase 0.40.6, age 1.2.1, Caddy 2.10.2, migraciones, version de codigo, interfaz y scripts PowerShell. No requiere Docker, Node ni Python en el consultorio.
- Arranque/detencion de procesos, inicio al entrar en la cuenta Windows (no antes del inicio de sesion), configuracion opcional de HTTPS en IPv4 privada y regla de firewall restringida. El proxy bloquea panel/API administrativos y no instala confianza en telefonos automaticamente.
- Respaldo completo cifrado con age: base detenida, fotografias, configuracion, migraciones y CA privada de HTTPS. Identidad de recuperacion cifrada con frase, destinatario publico en la PC. Restauracion en carpeta nueva, autenticacion del cifrado y verificacion SHA256 de todos los archivos antes de publicar. No reemplaza la base activa. Exportacion CSV/JSON sigue siendo parcial y no restaura el servidor.

## Limpieza local y hallazgos del informe de seguridad

Esta revision retira el SDK, configuracion y servicios cloud, las rutas de datos ficticios/localStorage, la importacion JSON al servidor cloud y la pantalla experimental separada. `npm run dev`/`build` y sus alias `:local` usan el mismo PocketBase y `dist-local`. Se conserva la interfaz original, las migraciones PocketBase ya publicadas y los archivos/datos de instalaciones existentes. Las fuentes Geist se empaquetan con licencia para evitar solicitudes a Google Fonts.

La documentacion obsoleta se traslado a `docs/archive` con una advertencia e indice. El codigo retirado sigue recuperable en el commit `177d0bd` y en la version anterior de `main`; no se duplica como un segundo backend activo. Los requisitos clinicos y de consentimiento vigentes se actualizaron para PocketBase. `local/spike` sigue siendo solo una referencia independiente de integridad.

### Hallazgo 1: actividad de una cuenta visible para otra — corregido

Se reprodujo antes del cambio en navegador real: A genero un conflicto con nombre/horario, cerro sesion y B vio ese detalle en Respaldos sin recargar la pestaña. El estado pertenecia a toda la vida de App.

Ahora `src/App.jsx` mantiene `useAuth` fuera de un subarbol clinico identificado por generacion de login y usuario. Al cerrar/cambiar cuenta se desmonta ese subarbol: actividad, datos, formularios, errores y avisos se descartan juntos; los callbacks viejos no actualizan la nueva instancia. `src/hooks/useAuth.js` consume el epoch de `src/local/pocketbaseClient.js`. Volver a la misma cuenta despues de cerrar sesion es una vida nueva; renovar el token de la cuenta vigente conserva su estado. Los intentos de acceso rechazados conservan el formulario y muestran su error.

Comprobacion posterior: el mismo recorrido A -> B ya no muestra actividad/nombres de A; una escritura de A con respuesta retenida hasta que B abre un formulario no modifica ni cierra ese formulario ni muestra datos/errores de A. Volver a A tambien mantiene la actividad anterior descartada. El guardado legitimo sigue persistiendo en PocketBase.

### Hallazgo 2: respuesta tardia de la version cloud — ruta retirada

El informe original lo clasifico con confianza media y sin reproduccion en ejecucion. Afectaba las rutas Supabase de guardado/restauracion. Esas rutas y sus dependencias ya no existen en el codigo activo; no se afirma haber modificado o auditado un servicio remoto. El unico proveedor es PocketBase y no hay importacion JSON ni fallback clinico del navegador. El aislamiento de callbacks se prueba tambien en la interfaz local como se describe arriba.

### Verificacion de esta limpieza

- `npm test`: aprobado, incluidos refresh del mismo login y logout/reentrada en una nueva generacion.
- `npm run build` y `npm run build:local`: aprobados, salida local compatible con el paquete.
- `node --check src/local/pocketbaseClient.js` y `node --check scripts/check_local_browser.cjs`: aprobados.
- `python -m unittest discover -s local/spike -p 'test_*.py' -v`: 7 aprobadas.
- `MINA_TEST_AGE_DIR=/tmp/mina-age-tools MINA_TEST_CADDY=/tmp/mina-caddy-tools/caddy MINA_TEST_PWSH=/tmp/mina-pwsh/pwsh python scripts/check_local.py /tmp/mina-tools/pocketbase --browser --backup --https`: aprobado en Linux con base temporal. Incluye 10 pruebas API, navegador, error de contraseña, ausencia de peticiones externas de la app, aislamiento entre cuentas, guardados tardios, HTTPS verificado y arranque/lectura de base recuperada con foto privada y notas.
- Sin referencias al SDK/configuracion Supabase ni a claves de demo clinico en el JS/HTML compilado; sin cambios a las migraciones PocketBase. Revision independiente del diff: sin bypass o regresion concreta encontrada (revision estatica, no sustituye las ejecuciones).

CI de esta limpieza, commit `0f97fba`, aprobada en Linux y Windows: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43559442053 . Tambien aprobaron empaquetado, arranque/proxy/detencion en ruta con espacios con PowerShell 5.1 y registro/retirada de tarea de inicio. ZIP x64 probado: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43559442053/artifacts/14099668002 (retencion 14 dias). La validacion del consultorio sigue pendiente. La prueba de persistencia de expedientes/foto comunicada por Christofer corresponde a su laptop; no equivale a restauracion en otro equipo. Ese commit de limpieza no incluia instalador guiado, icono/ventana propia ni recordar equipo; el bloque de candidata descrito al inicio agrega esas funciones. El cambio de imagen del consultorio sigue aplazado.

## Pruebas ejecutadas antes de la limpieza

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

En Windows, `python scripts/package_windows.py` construye `local-release/Instalar-MINA.exe` con su SHA-256 y el ZIP `local-release/MINA-Local-Windows-x64.zip`. CI publica ambos solo despues de pasar las pruebas Windows, incluido el instalador nativo y la compatibilidad PowerShell 5.1 de las herramientas de soporte. Empaquetar desde Linux genera un ZIP de evaluacion sin compilacion nativa. No implica que se haya instalado en el consultorio.

## Pendiente imprescindible en el equipo real

1. Probar el paquete x64 en la PC Windows 11 Pro Education del consultorio (4 GB RAM); confirmar si el iPhone se usara desde el inicio.
2. Verificar arranque tras inicio de sesion/reinicio, recuperacion de energia, UPS y disponibilidad real de la PC.
3. Reservar IP en router, red interna, firewall privado, instalar/verificar CA en telefono y comprobar HTTPS sin advertencias, citas simultaneas y fotografias desde ambos dispositivos.
4. Verificar cifrado del disco Windows, cuentas/permisos y custodia de clave/frase. El respaldo utiliza temporales sin cifrar en el directorio de datos, que se eliminan ante errores normales; no promete borrado fisico.
5. Probar copia al disco externo y restauracion en otro equipo, incluidas fotos y CA; conservar el paquete de la version de cada respaldo y una segunda copia desconectada. El respaldo es manual y tiene limite de 20 GB descomprimidos.
6. Acordar responsable de mantenimiento, actualizaciones, custodia y frecuencia de pruebas de recuperacion. No migrar expedientes clinicos ni retirar el sistema previo hasta completar estas comprobaciones.

Procedimiento de instalacion, HTTPS y respaldo: `docs/mina-local-windows.md`. No declarar terminado el proyecto por compilar o por pasar CI: las comprobaciones del consultorio siguen pendientes.

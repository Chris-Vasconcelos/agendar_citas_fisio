# Revisión funcional de MINA Local

## Motivo y límite

La revisión anterior cubría recorridos principales, compilación y API, pero no comprobaba suficientemente lo que hacían los controles de actualización ni varios estados de carga y edición. El fallo de Recordatorios fue un hueco de cobertura real. Que esas pruebas pasaran no demostraba la ausencia de estos errores.

Se revisaron las pantallas activas, los tres hooks de datos, el cliente PocketBase, fotografías, exportaciones, sesión, migraciones y el flujo de Windows/respaldo que ejecuta CI. Se añadieron pruebas con un servidor real y Chromium. No es una certificación de seguridad ni una prueba del consultorio.

## Defectos y correcciones

| Área | Problema comprobado | Resultado esperado y comprobación |
| --- | --- | --- |
| Agenda | Rango limitado a horarios activos: ocultaba citas al cerrar/acortar un día o fuera de ese rango | Las filas incluyen las citas existentes aunque no haya horario activo; no ofrece espacios vacíos fuera de horario |
| Agenda | Solo mostraba la primera cita de cada espacio dentro de una hora | Muestra ambas citas consecutivas, con sus horas reales; celda de las 23:00 termina en el día siguiente |
| Datos | Navegar entre pestañas reutilizaba la carga inicial | Relee pacientes, citas y horarios al navegar; Actualizar datos permite una recarga explícita; fallos bloquean vistas y nuevas citas hasta reintentar |
| Exportación | JSON/CSV se generaban con datos anteriores; podían exportarlos incluso con el servidor caído | Consulta el servidor al exportar; un fallo muestra error y no genera el archivo antiguo; siguen siendo exportaciones parciales sin fotos |
| Fotografías | Lista vacía durante carga/error y pérdida de selección al cerrar | Estados separados de carga/error/vacío; reconsulta; confirmación antes de descartar selección y cierre bloqueado mientras guarda |
| Edición simultánea | Un formulario antiguo podía sobrescribir notas o datos posteriores | Comparación atómica de versiones en SQLite para pacientes, citas, horarios y seguimiento; rechaza la versión antigua y conserva el texto del formulario |
| Notas canceladas | La edición se validaba como una cita activa y podía chocar con el espacio reutilizado; selector no incluía Cancelada | Conserva el estado cancelado y permite guardar su nota sin volver a ocupar el espacio |
| WhatsApp | Ruta duplicada desde Agenda usaba la hora de la celda y prefijaba 52 sin normalizar | Pasa por Recordatorios para citas elegibles; reutiliza hora real, normalización, autorización y confirmación manual |
| Entrada y formularios | Preferencias sin protección ante almacenamiento bloqueado; búsqueda de paciente retenida al reabrir Nueva cita | Preferencias opcionales con valor predeterminado e inicio en memoria; búsqueda reiniciada al abrir; edad entera y teléfono con dígitos validados |

La actualización por pestaña/botón no promete sincronización instantánea entre equipos. Las comprobaciones de conflicto y versión sí se aplican en el servidor.

## Evidencia reproducible

Base de comparación: `325fa0e`, con sus migraciones y una compilación aislada. Se ejecutó `check_functional_review.cjs` contra esa copia con operadores/expedientes ficticios: fallaron los doce casos de agenda, foto, actualización, exportación, escritura obsoleta y almacenamiento bloqueado previstos para esa base. Los fallos de varias pruebas corresponden al mismo defecto de fondo; no se presentan como doce vulnerabilidades diferentes.

Pruebas añadidas/permanentes:

- `tests/calendar.test.js`: horarios cerrados/acortados, dos citas consecutivas en una celda y última hora del día.
- `tests/localClient.test.js`: error 5xx de escritura con resultado incierto y mensaje de conflicto con versión capturada.
- `local/pocketbase/test_api.py`: edición obsoleta y dos PATCH simultáneos sobre la misma versión. Solo uno se acepta, en las cuatro colecciones protegidas. Conserva pruebas de propietario, privacidad, domingo y empalmes.
- `scripts/check_functional_review.cjs`: recorrido adicional de navegador con los casos anteriores, JSON/CSV actuales, fallos sin descarga/lista vacía, notas obsoletas/canceladas, duplicados, recuperación de carga/sesión y navegador con almacenamiento bloqueado.
- `scripts/check_upgrade.py`: inicia el esquema anterior, crea datos y foto privada reales ficticios, aplica la migración y comprueba conservación, consulta de foto, rechazo de una escritura antigua y aceptación de una versión actual.
- Continúan el recorrido original del navegador y las pruebas de HTTPS, respaldo cifrado/restauración y Windows nativo.

Validación final del código `12b1d231b3e47224787ddd9726a2ce112ce9a0be`: **aprobada en Linux y Windows**. Incluye 37 pruebas Node, 12 pruebas API (con ediciones simultáneas en cuatro colecciones), siete SQLite, ambas compilaciones, el recorrido original y 16 casos adicionales de navegador, migración desde el esquema anterior con foto privada, HTTPS, respaldo cifrado/restauración e instalador nativo Windows. También se completó la ejecución integral local con restauración real. No se probaron pacientes reales.

- CI: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43758606118
- Paquete de esta revisión: https://github.com/Chris-Vasconcelos/agendar_citas_fisio/actions/runs/43758606118/artifacts/14179382856 (retención 14 días).
- SHA-256 de `Instalar-MINA.exe`: `350e94abdbced536f754634dc1f63b40c14070b78030d53a4883c623522cc4c6`.
- Salida resumida de la reproducción sobre la base anterior: [validacion-mina-base-325fa0e.txt](validacion-mina-base-325fa0e.txt).

Estos resultados no equivalen a la validación de la PC de Lalo. El PR #30 continúa como borrador, sin fusionar ni modificar main.

## Instalación y compatibilidad

La migración `1794787200_write_versions.js` añade metadatos de versión y restricciones de actualización, conservando los datos anteriores. Debe instalarse el paquete completo correspondiente: una interfaz anterior no puede editar de forma fiable la base migrada y sus escrituras deben rechazarse. No retirar la protección ni borrar la base para volver a una versión anterior; restaurar un respaldo completo verificado si se necesita una reversión.

La copia automática previa a actualizar sigue en el mismo disco y sin cifrado propio; no sustituye el respaldo externo cifrado. No se ha actualizado remotamente ninguna instalación del usuario.

## Lo que sigue pendiente

Aceptación de Lalo y jornada simulada en su Windows real; rendimiento con 4 GB, reinicio/suspensión/energía; cuenta y cifrado de disco; medio externo, custodia de clave y restauración en otro equipo; mantenimiento. El iPhone y su red/HTTPS real solo si se incluyen en el alcance. No hay envío automático de WhatsApp ni restauración JSON. Las pausas/excepciones de horario por fecha requieren otra función.

El resultado de esta revisión debe comunicarse como correcciones verificadas dentro de este alcance, nunca como «ya no puede haber errores» ni como autorización automática para usar expedientes reales.

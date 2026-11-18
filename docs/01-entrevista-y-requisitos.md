# Requisitos vigentes de MINA Local

Aplicacion para el consultorio de Lalo/Eduardo. Una sola base PocketBase en la PC Windows; React conserva las pantallas originales. Sin hosting, integracion de calendario ni base alternativa en el navegador.

- Pacientes: alta, busqueda por nombre/telefono, edicion, antecedentes, alergias, motivo de consulta, consentimiento y advertencia de duplicados.
- Expedientes archivados: conservar historial, notas y fotografias; no eliminar pacientes para liberar la agenda.
- Agenda: espacios 1 y 2; permitir dos atenciones simultaneas en espacios distintos, impedir solapamientos del espacio o del paciente, tambien entre dispositivos. La cancelacion libera el espacio.
- Horarios semanales, incluido domingo como 0; notas de evolucion, tratamientos y profesional por sesion.
- Fotografias privadas de consentimientos, asociadas al expediente y con confirmacion visual antes de guardarse.
- Recordatorios de WhatsApp manuales: abrir mensaje, enviar en WhatsApp y confirmar manualmente en MINA. No confirmar entregas automaticas.
- Copia completa cifrada con fotografias y recuperacion comprobada. JSON/CSV son exportaciones parciales, no restauraciones del servidor.
- Windows x64, sin Docker ni herramientas de desarrollo en el equipo final. Inicio al entrar en Windows; la PC debe estar encendida para utilizar el servicio.

Equipo comunicado: HP ProOne 245 G10, Windows 11 Pro Education 23H2, procesador x64, 4 GB RAM y unos 43 GB libres. Hay que medir rendimiento y revisar proteccion/actualizaciones en el equipo real. El telefono es iPhone; su uso inicial aun debe confirmarse. El disco externo tambien esta pendiente de confirmar/conseguir.

Validacion comunicada por Christofer: creo la cuenta, reinicio y volvio a consultar expedientes y fotografia en su laptop. No equivale a prueba en la PC del consultorio ni a restauracion desde respaldo.

Proximos bloques de facilidad de uso: instalacion guiada, acceso directo y ventana propia, comprobacion del arranque y estrategia de sesion con bloqueo. No se declaran implementados por esta limpieza. Cambio de la M por imagen del consultorio aplazado por el usuario.

La entrevista original permanece en [el archivo historico](archive/01-entrevista-y-requisitos.md).

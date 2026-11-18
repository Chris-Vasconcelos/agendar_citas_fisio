# MINA Local — cierre de version candidata

El paquete esta preparado para evaluacion con datos ficticios. La entrega para pacientes reales se cierra al completar y registrar las comprobaciones del consultorio; compilar o pasar CI no sustituye esa aceptacion.

## Alcance de la primera entrega

PC Windows x64 del consultorio; React original, PocketBase y una base local. Pacientes, dos espacios de citas, notas, horarios, fotos privadas y WhatsApp manual. El iPhone es opcional: no activa red ni retrasa una entrega exclusivamente en PC si Lalo confirma ese alcance.

El programa se instala por usuario con `Instalar-MINA.exe`, crea accesos y arranca el servidor al entrar en Windows. Los datos anteriores permanecen en su carpeta. La imagen del consultorio sigue aplazada.

## Cierre funcional en el equipo de Lalo

Registrar resultado y responsable de cada punto:

- [ ] Abrir el instalador desde la descarga sin comandos, verificar procedencia/avisos Windows y conservar los expedientes de una actualizacion. Usar siempre la misma cuenta Windows.
- [ ] Crear las cuentas o entrar con la cuenta MINA existente, sin confundir responsable y uso diario.
- [ ] Abrir con el icono MINA y ventana propia; abrir repetidamente sin otro servidor y reiniciar Windows para comprobar el inicio al entrar en la cuenta.
- [ ] Completar una jornada simulada: paciente, busqueda/duplicado, dos citas simultaneas, conflicto rechazado, nota, fotografia y consulta posterior al reinicio. Lalo valida campos y consentimientos.
- [ ] Probar recordar equipo, bloqueo por inactividad/manual, contraseña de desbloqueo y recuperacion de una captura sin guardar. Cerrar sesion debe retirar el acceso de otras ventanas.
- [ ] Comprobar rendimiento con sus 4 GB RAM y aplicaciones habituales; revisar suspension, energia y recuperacion tras apagado.

## Cierre de proteccion y recuperacion

- [ ] Cuenta Windows protegida y cifrado del disco comprobado, sin asumir que esta habilitado por la edicion del sistema.
- [ ] Medio de respaldo fuera de la PC y espacio disponible. Identidad cifrada de recuperacion y su frase bajo custodia separada.
- [ ] Crear una copia completa cifrada y restaurarla en otro equipo, verificando pacientes, citas, notas, fotografias y permisos; conservar el paquete correspondiente.
- [ ] Segunda copia desconectada y responsable/frecuencia de respaldo y mantenimiento acordados.
- [ ] Si se incluye iPhone, HTTPS sin advertencias con IP reservada, red privada y reglas de firewall comprobadas, sin puertos del router publicados a internet.

Las copias automaticas previas a una actualizacion permanecen en el mismo disco y no sustituyen el respaldo externo. El bloqueo de pantalla de MINA tampoco sustituye el bloqueo de Windows/cifrado ni protege ante control de la cuenta Windows.

## Mensaje de estado

Antes del cierre: «Tenemos una version candidata funcional para probar contigo; estamos comprobando instalacion y recuperacion en tu equipo».

Despues del cierre: registrar version instalada, fecha de aceptacion por Lalo, resultados y ubicacion/custodia de respaldos. Solo entonces confirmar el uso diario con pacientes. No se requiere fusionar main para evaluar el paquete del PR.

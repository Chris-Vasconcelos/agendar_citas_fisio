# MINA Local — paquete de evaluación Windows x64

Estado: integración en desarrollo, exclusivamente datos ficticios. No instalar aún como sistema clínico definitivo.

El paquete contiene PocketBase 0.40.6 para Windows x64, age 1.2.1, migraciones y la interfaz compilada. No requiere Docker, Node ni Python en la computadora del consultorio. Edición y arquitectura de Windows pendientes de confirmar con Lalo.

1. Extraer el ZIP completo a una carpeta estable del usuario.
2. Revisar los scripts PowerShell antes de ejecutarlos. Si Windows los bloquea, comprobar procedencia y firma/hash; no deshabilitar globalmente la política de ejecución.
3. Ejecutar `Iniciar-MINA.ps1`. Los datos se guardan en `%LOCALAPPDATA%\MINA-Local\pb_data`, fuera de la carpeta de la aplicación.
4. Configurar el primer administrador con el enlace local de instalación que registra PocketBase en `servidor.log`. Ese enlace es sensible; no compartir el registro.
5. Ejecutar `Configurar-cuenta.ps1` para crear la cuenta diaria usando el administrador local. No usar la cuenta administrativa para atender pacientes.
6. Abrir `http://127.0.0.1:8090`. `Detener-MINA.ps1` detiene el proceso de esta instalación.
7. `Inicio-automatico.ps1` registra inicio al entrar en la cuenta Windows, no antes del inicio de sesión. Debe comprobarse en el equipo real.

## Límites pendientes

Los scripts son una primera preparación y necesitan validación en Windows. Escuchan exclusivamente en loopback: no habilitan LAN, HTTPS ni acceso desde celular. No abrir puertos para eludir esa limitación.

## Respaldo completo cifrado

Los siguientes comandos se ejecutan con PowerShell en la carpeta extraida del paquete. Sustituir las rutas de ejemplo por las del disco externo. No guardar la clave de recuperacion junto con su frase ni depender solo de la PC del consultorio.

```powershell
.\Preparar-respaldos.ps1 -ClaveRecuperacion 'E:\Custodia\MINA-recuperacion.age'
.\Crear-respaldo.ps1 -Destino 'E:\Respaldos-MINA'
```

La preparacion genera una identidad age, la cifra con una frase solicitada por age en la terminal y guarda en la PC solamente el destinatario publico. Es imprescindible conservar la identidad cifrada y recordar su frase; perderlas impide recuperar las copias. La identidad privada sin cifrar nunca se escribe a disco por este procedimiento. Antes de usar datos reales se debe comprobar la custodia y la recuperacion.

Crear-respaldo detiene temporalmente el servidor (tambien deja de funcionar el acceso del celular), toma una copia completa de `pb_data`, incluidas base, configuracion y fotografias, adjunta las migraciones y la version del paquete, cifra con age y reinicia MINA solo si termina correctamente. Un fallo deja MINA detenida para revisar el error; ejecutar Iniciar-MINA cuando se resuelva. No apagar ni desconectar la unidad mientras se respalda. El destino debe existir y estar fuera de los datos y de la aplicacion. Las copias no se eliminan ni se rotan automaticamente; vigilar el espacio disponible y mantener una segunda copia desconectada en otra ubicacion.

Se crea un ZIP temporal sin cifrar dentro de la carpeta de datos del usuario y se elimina al terminar, tambien ante errores normales. Es indispensable verificar el cifrado de disco de Windows para proteger los datos activos y estos temporales; eliminarlos no garantiza borrado fisico. Los binarios incluidos se descargan de versiones oficiales y sus SHA256 estan fijados en los scripts de empaquetado.

## Comprobar una restauracion

```powershell
.\Restaurar-respaldo.ps1 -Respaldo 'E:\Respaldos-MINA\MINA-ejemplo.zip.age' -ClaveRecuperacion 'E:\Custodia\MINA-recuperacion.age' -CarpetaNueva "$env:LOCALAPPDATA\MINA-Prueba-recuperacion"
```

age solicita la frase de la identidad cifrada. La restauracion se publica en una carpeta **nueva** solo si el cifrado se autentica y coinciden todos los hashes y tamanos del manifiesto. Nunca reemplaza la instalacion activa. Se rechazan claves incorrectas, modificaciones del archivo y rutas fuera de la carpeta. Limite actual: 20 GB descomprimidos por respaldo. Una recuperacion extrae datos sin cifrar: usar un disco cifrado y una cuenta Windows protegida.

Conservar el ZIP del paquete de aplicacion correspondiente a `version.json` del respaldo. Para el ensayo, cerrar la instalacion actual y arrancar el paquete correspondiente con `Iniciar-MINA.ps1 -DataRoot "$env:LOCALAPPDATA\MINA-Prueba-recuperacion"`. Verificar inicio de sesion, pacientes, citas, notas y apertura de fotografias, primero en otra carpeta y antes del uso clinico tambien en otro equipo. No ejecutar simultaneamente dos servidores sobre el mismo puerto ni la misma base. Cerrar el ensayo antes de volver a iniciar la instalacion habitual. Repetir y registrar esta comprobacion periodicamente.

Exportar JSON/CSV no incluye fotografías y no sustituye este respaldo. La restauración JSON está deshabilitada para el backend local para evitar una falsa restauración en memoria. Esta primera version ofrece respaldo manual; no promete copias programadas ni recuperacion despues de un apagon sin verificar Windows real.

Antes del uso clínico: validar Windows real, HTTPS y celular, protección del disco y cuentas Windows, respaldo completo cifrado a disco externo, restauración en otro equipo, recuperación tras reinicio/apagón y responsable de mantenimiento.

# MINA Local — paquete de evaluación Windows x64

Estado: integración en desarrollo, exclusivamente datos ficticios. No instalar aún como sistema clínico definitivo.

El paquete contiene PocketBase 0.40.6 para Windows x64, age 1.2.1, Caddy 2.10.2, migraciones y la interfaz compilada. No requiere Docker, Node ni Python en la computadora del consultorio. Equipo comunicado: Windows 11 Pro Education 23H2 x64 y 4 GB RAM; la validacion de instalacion/rendimiento en esa PC sigue pendiente.

## Uso normal: instalar y abrir sin comandos

1. Descargar el artefacto del PR verificado y extraer `Instalar-MINA.exe`. Ese archivo contiene el paquete completo; no necesita Node, Python, Docker ni ejecutar scripts de PowerShell para el inicio cotidiano.
2. Comprobar que procede de la ejecucion/commit anunciado. El artefacto incluye SHA256 del instalador. El ejecutable no tiene aun firma de editor: Windows puede mostrar un aviso de reputacion o una politica empresarial puede impedirlo. Verificar procedencia y consultar al responsable; no desactivar antivirus, SmartScreen ni politicas globales.
3. Cerrar MINA y guardar capturas abiertas. Ejecutar `Instalar-MINA.exe` y confirmar el paso del asistente. Se instala para la cuenta Windows actual en `%LOCALAPPDATA%\MINA-Local\app`, conservando `%LOCALAPPDATA%\MINA-Local\pb_data`. No instalar desde otra cuenta Windows para buscar los datos anteriores.
4. En una instalacion nueva, el asistente solicita cuenta del responsable y cuenta cotidiana. Las contraseñas nuevas deben ser distintas, al menos 12 caracteres; guardar las del responsable para administracion/recuperacion. No se ponen contraseñas en comandos ni archivos. Si ya existen cuentas, elegir abrir con la cuenta actual; no crear otra para ver los mismos expedientes.
5. Abrir el icono **MINA** del escritorio. Comprueba los archivos, identifica el servidor de esa base, lo inicia si es necesario y abre una ventana Edge/Chrome con perfil separado y sin barra de direcciones. El primer acceso desde ese perfil pide la cuenta cotidiana existente.
6. El icono **Comprobar MINA** permite revisar archivos, servidor y navegador, abrir de nuevo y guardar un diagnostico sin expedientes, fotos, registros privados ni tokens. Si hay error, enviar solo ese diagnostico, no `servidor.log` ni el perfil del navegador.
7. MINA prepara un acceso de inicio en la carpeta Inicio de esa cuenta Windows. Funciona al entrar en Windows, no antes del inicio de sesion. Una tarea antigua de MINA en PowerShell se retira solo si coincide con la configuracion conocida. Probar el reinicio en el equipo real.

El programa conserva la version anterior y una copia local previa de los datos al actualizar. Estan dentro del mismo directorio protegido del usuario: no son copias cifradas externas ni sustituyen la recuperacion en otro equipo. Comprobar espacio y cifrado del disco. No borrar la carpeta `pb_data` para solucionar un arranque.

## Sesion durante la jornada

- Por defecto el acceso se conserva en la pestaña/ventana. **Recordar este equipo** es opcional, solo en una cuenta Windows privada y protegida; conserva token/metadatos durante una jornada de hasta ocho horas, nunca contraseñas ni expedientes. Al reabrir se valida con PocketBase antes de mostrar datos.
- Tras diez minutos sin actividad o con el boton **Bloquear MINA**, se oculta/inactiva la pantalla y se bloquean nuevas consultas del cliente. Las capturas y la foto seleccionada permanecen en memoria dentro de la ventana, y las ventanas de fotos abiertas por MINA se cierran.
- Desbloquear exige la contraseña de la misma cuenta. Al terminar la jornada se exige autenticar otra vez; una nueva jornada puede continuar las capturas de esa ventana. Cerrar la ventana puede descartarlas: el navegador avisa si hay formularios o una foto pendientes. No hay borrador clinico persistente en el navegador.
- Cerrar sesion borra el acceso recordado y lo retira de otras ventanas del mismo perfil. No es una revocacion de tokens ya robados; PocketBase limita el token a ocho horas y cambiar la contraseña permite revocarlo. El bloqueo visual del cliente no protege frente a quien controle esa cuenta Windows o sus archivos.
- El perfil de MINA es independiente del navegador cotidiano. Usar el mismo usuario Windows y el acceso MINA para conservar las preferencias y el acceso recordado. Si el navegador bloquea su almacenamiento o se borra el perfil, se pedira iniciar sesion otra vez.

## Herramientas avanzadas del paquete

Los scripts se conservan para respaldo/HTTPS y soporte, no son el flujo normal de instalacion/inicio. `Iniciar-MINA.ps1`, `Detener-MINA.ps1`, `Configurar-cuenta.ps1` y `Inicio-automatico.ps1` siguen disponibles como compatibilidad. No crear a la vez otro inicio automatico por scripts si ya se instalo el nativo.

## Límites pendientes

PocketBase escucha exclusivamente en loopback. El acceso opcional desde celular requiere configurar el proxy HTTPS y confiar en su certificado mediante el procedimiento de abajo. No exponer directamente PocketBase ni abrir puertos del router a internet. Los ensayos de Windows Server en CI no sustituyen el equipo Windows del consultorio.

## Celular con HTTPS en la red privada

1. Confirmar Windows x64, red interna separada de visitantes, hora correcta en PC/celular y una IPv4 **reservada en el router** para la PC. La interfaz Windows debe estar marcada como Privada. La PC debe permanecer encendida y con la sesion Windows iniciada.
2. Desde la carpeta del paquete, ejecutar `Configurar-celular.ps1 -DireccionPrivada 192.168.1.50 -ConfiarEnEstaPC` sustituyendo la IP por la real reservada. El script solo acepta IPv4 privada asignada a esa PC. No usar la IP del ejemplo sin comprobarla. Crea la CA local dentro de los datos de MINA y muestra el certificado **publico** y su huella SHA256. Solo importa la confianza en la cuenta Windows actual si se proporciona `-ConfiarEnEstaPC`.
3. Permitir HTTPS en Firewall de Windows mediante el mismo comando con `-AbrirFirewall` desde PowerShell elevado, manteniendo la misma cuenta y carpeta `-DataRoot`. La regla permite solo TCP 443, IP privada elegida, programa Caddy y origen LocalSubnet en perfil Privado. El script admite repetir la misma configuracion; rechaza sustituir silenciosamente otra IP. No desactivar el firewall, no crear reglas generales ni habilitar UPnP/reenvio de puertos. Si la elevacion utiliza otra cuenta administrativa, proporcionar explicitamente la carpeta de datos de la cuenta de Lalo.
4. Transferir **solo** `Certificado-publico-MINA.crt` al telefono, preferiblemente por USB; verificar la huella SHA256 del certificado frente a la mostrada en la PC. Nunca transferir `root.key`, `intermediate.key` ni la carpeta `https-datos`. En Android instalar el certificado de CA de usuario desde los ajustes de seguridad/credenciales (el nombre varia segun fabricante). En iPhone instalar el perfil del certificado y activar su confianza explicita en Ajustes > General > Informacion > Ajustes de confianza de certificados. Confirmar los pasos exactos segun el telefono real.
5. Conectar el telefono al Wi-Fi interno y abrir `https://IP-RESERVADA` en el navegador. Debe funcionar **sin advertencias de certificado**. Si hay advertencias, detener la prueba y corregir confianza, fecha/IP o red; no saltarlas. Iniciar sesion con una cuenta diaria, probar pacientes ficticios, citas simultaneas y apertura de fotografias. Comprobar que `https://IP-RESERVADA/_/` devuelve 404. El panel administrativo sigue disponible solo en la PC, `http://127.0.0.1:8090/_/`.

El proxy bloquea el panel y las API administrativas, permite las rutas de la aplicacion y conserva la autorizacion por operador de PocketBase. No instala automaticamente confianza en telefonos ni cambia su configuracion. Caddy no usa certificados publicos ni necesita publicar el consultorio en internet. Sin configuracion de celular, no se inicia el proxy ni se abre la red. `Iniciar-MINA` y `Detener-MINA` manejan ambos procesos cuando se configura HTTPS; el inicio al entrar en Windows conserva esa configuracion.

Los respaldos cifrados incluyen tambien la CA privada y la configuracion HTTPS, por lo que la clave de recuperacion protege esa confianza. Una restauracion con la misma IP puede conservarla; si se cambia CA/IP, revisar certificados y firewall y repetir los ensayos. No copiar las claves por separado. En caso de compromiso de la PC/CA, retirar su confianza de los telefonos y emitir una nueva CA bajo responsabilidad del mantenimiento.

Comprobado automaticamente en desarrollo con CA temporal: certificado validado contra la CA especifica y la IP, rechazo sin confiar en ella, interfaz original, acceso autenticado y fotografia privada, y bloqueo de administracion. No se declara probado el Wi-Fi, el firewall ni la confianza TLS de un celular real.

## Respaldo completo cifrado

Los siguientes comandos se ejecutan con PowerShell en la carpeta extraida del paquete. Sustituir las rutas de ejemplo por las del disco externo. No guardar la clave de recuperacion junto con su frase ni depender solo de la PC del consultorio.

```powershell
.\Preparar-respaldos.ps1 -ClaveRecuperacion 'E:\Custodia\MINA-recuperacion.age'
.\Crear-respaldo.ps1 -Destino 'E:\Respaldos-MINA'
```

La preparacion genera una identidad age, la cifra con una frase solicitada por age en la terminal y guarda en la PC solamente el destinatario publico. Es imprescindible conservar la identidad cifrada y recordar su frase; perderlas impide recuperar las copias. La identidad privada sin cifrar nunca se escribe a disco por este procedimiento. Antes de usar datos reales se debe comprobar la custodia y la recuperacion.

Crear-respaldo detiene temporalmente el servidor y el proxy HTTPS (tambien deja de funcionar el acceso del celular), toma una copia completa de `pb_data`, incluidas base, configuracion y fotografias, adjunta las migraciones, la CA/configuracion HTTPS cuando existen y la version del paquete, cifra con age y reinicia MINA solo si termina correctamente. Un fallo deja MINA detenida para revisar el error; ejecutar Iniciar-MINA cuando se resuelva. No apagar ni desconectar la unidad mientras se respalda. El destino debe existir y estar fuera de los datos y de la aplicacion. Las copias no se eliminan ni se rotan automaticamente; vigilar el espacio disponible y mantener una segunda copia desconectada en otra ubicacion.

Se crea un ZIP temporal sin cifrar dentro de la carpeta de datos del usuario y se elimina al terminar, tambien ante errores normales. Es indispensable verificar el cifrado de disco de Windows para proteger los datos activos y estos temporales; eliminarlos no garantiza borrado fisico. Los binarios incluidos se descargan de versiones oficiales y sus SHA256 estan fijados en los scripts de empaquetado.

## Comprobar una restauracion

```powershell
.\Restaurar-respaldo.ps1 -Respaldo 'E:\Respaldos-MINA\MINA-ejemplo.zip.age' -ClaveRecuperacion 'E:\Custodia\MINA-recuperacion.age' -CarpetaNueva "$env:LOCALAPPDATA\MINA-Prueba-recuperacion"
```

age solicita la frase de la identidad cifrada. La restauracion se publica en una carpeta **nueva** solo si el cifrado se autentica y coinciden todos los hashes y tamanos del manifiesto. Nunca reemplaza la instalacion activa. Se rechazan claves incorrectas, modificaciones del archivo y rutas fuera de la carpeta. Limite actual: 20 GB descomprimidos por respaldo. Una recuperacion extrae datos sin cifrar: usar un disco cifrado y una cuenta Windows protegida.

Conservar el ZIP del paquete de aplicacion correspondiente a `version.json` del respaldo. Para el ensayo, cerrar la instalacion actual y arrancar el paquete correspondiente con `Iniciar-MINA.ps1 -DataRoot "$env:LOCALAPPDATA\MINA-Prueba-recuperacion"`. Verificar inicio de sesion, pacientes, citas, notas y apertura de fotografias, primero en otra carpeta y antes del uso clinico tambien en otro equipo. No ejecutar simultaneamente dos servidores sobre el mismo puerto ni la misma base. Cerrar el ensayo antes de volver a iniciar la instalacion habitual. Repetir y registrar esta comprobacion periodicamente.

Exportar JSON/CSV no incluye fotografías y no sustituye este respaldo. La restauración JSON está deshabilitada para el backend local para evitar una falsa restauración en memoria. Esta primera version ofrece respaldo manual; no promete copias programadas ni recuperacion despues de un apagon sin verificar Windows real.

Antes del uso clínico: validar Windows real, HTTPS y celular, protección del disco y cuentas Windows, respaldo completo cifrado a disco externo, restauración en otro equipo, recuperación tras reinicio/apagón y responsable de mantenimiento.

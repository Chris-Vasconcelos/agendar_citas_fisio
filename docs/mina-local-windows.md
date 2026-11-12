# MINA Local — paquete de evaluación Windows x64

Estado: integración en desarrollo, exclusivamente datos ficticios. No instalar aún como sistema clínico definitivo.

El paquete contiene PocketBase 0.40.6 para Windows x64, age 1.2.1, Caddy 2.10.2, migraciones y la interfaz compilada. No requiere Docker, Node ni Python en la computadora del consultorio. Edición y arquitectura de Windows pendientes de confirmar con Lalo.

1. Extraer el ZIP completo a una carpeta estable del usuario.
2. Revisar los scripts PowerShell antes de ejecutarlos. Si Windows los bloquea, comprobar procedencia y firma/hash; no deshabilitar globalmente la política de ejecución.
3. Ejecutar `Iniciar-MINA.ps1`. Los datos se guardan en `%LOCALAPPDATA%\MINA-Local\pb_data`, fuera de la carpeta de la aplicación.
4. Configurar el primer administrador con el enlace local de instalación que registra PocketBase en `servidor.log`. Ese enlace es sensible; no compartir el registro.
5. Ejecutar `Configurar-cuenta.ps1` para crear la cuenta diaria usando el administrador local. No usar la cuenta administrativa para atender pacientes.
6. Abrir `http://127.0.0.1:8090`. `Detener-MINA.ps1` detiene el proceso de esta instalación.
7. `Inicio-automatico.ps1` registra inicio al entrar en la cuenta Windows, no antes del inicio de sesión. Debe comprobarse en el equipo real.

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

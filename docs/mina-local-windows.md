# MINA Local — paquete de evaluación Windows x64

Estado: integración en desarrollo, exclusivamente datos ficticios. No instalar aún como sistema clínico definitivo.

El paquete contiene PocketBase 0.40.6 para Windows x64, migraciones y la interfaz compilada. No requiere Docker, Node ni Python en la computadora del consultorio. Edición y arquitectura de Windows pendientes de confirmar con Lalo.

1. Extraer el ZIP completo a una carpeta estable del usuario.
2. Revisar los scripts PowerShell antes de ejecutarlos. Si Windows los bloquea, comprobar procedencia y firma/hash; no deshabilitar globalmente la política de ejecución.
3. Ejecutar `Iniciar-MINA.ps1`. Los datos se guardan en `%LOCALAPPDATA%\MINA-Local\pb_data`, fuera de la carpeta de la aplicación.
4. Configurar el primer administrador con el enlace local de instalación que registra PocketBase en `servidor.log`. Ese enlace es sensible; no compartir el registro.
5. Ejecutar `Configurar-cuenta.ps1` para crear la cuenta diaria usando el administrador local. No usar la cuenta administrativa para atender pacientes.
6. Abrir `http://127.0.0.1:8090`. `Detener-MINA.ps1` detiene el proceso de esta instalación.
7. `Inicio-automatico.ps1` registra inicio al entrar en la cuenta Windows, no antes del inicio de sesión. Debe comprobarse en el equipo real.

## Límites pendientes

Los scripts son una primera preparación y necesitan validación en Windows. Escuchan exclusivamente en loopback: no habilitan LAN, HTTPS ni acceso desde celular. No abrir puertos para eludir esa limitación.

No se ha implementado todavía un procedimiento completo de respaldo cifrado y restauración. Exportar JSON/CSV no incluye fotografías. La restauración JSON está deshabilitada para el backend local para evitar una falsa restauración en memoria.

Antes del uso clínico: validar Windows real, HTTPS y celular, protección del disco y cuentas Windows, respaldo completo cifrado a disco externo, restauración en otro equipo, recuperación tras reinicio/apagón y responsable de mantenimiento.

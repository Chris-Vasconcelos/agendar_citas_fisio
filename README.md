# MINA Local — El valor del movimiento

Aplicacion de citas y expedientes de fisioterapia para el consultorio de Lalo/Eduardo. Esta rama utiliza exclusivamente **PocketBase local**, SQLite administrada por PocketBase y fotografias privadas. React/Vite conserva el diseño original.

Una sola base en la PC Windows. Sin hosting, integracion de calendarios, servicios cloud ni expedientes alternativos en el navegador. Las preferencias visuales pueden persistir en el navegador y el token se conserva en sessionStorage, siempre sujeto a validacion.

## Usar el paquete Windows

El consultorio no necesita Docker, Node ni Python. Abrir `Instalar-MINA.exe` desde el artefacto verificado y seguir [Instalacion, cuentas y recuperacion](docs/mina-local-windows.md). Conservar una sola carpeta de programa estable. Los datos se guardan por separado en `%LOCALAPPDATA%\MINA-Local\pb_data`.

[Estado, pruebas y pendientes](docs/mina-local-estado-integracion.md). Las pruebas de desarrollo y la prueba de persistencia comunicada desde la laptop no sustituyen la validacion del equipo de Lalo, cifrado y restauracion desde respaldo externo. Utilizar datos ficticios hasta completarla.

## Desarrollo

1. Instalar Node y Python solamente en el entorno de desarrollo; ejecutar `npm ci`.
2. Descargar el PocketBase oficial fijado con `python scripts/get_pocketbase.py linux_amd64 tools-pb` (en Windows: `windows_amd64`).
3. Para una base de prueba nueva, iniciar PocketBase en loopback con `--migrationsDir local/pocketbase/pb_migrations` y un `--dir` de pruebas; crear administrador y cuenta cotidiana segun la guia Windows. No utilizar datos clinicos reales ni la carpeta de una instalacion existente para estas pruebas.
4. Ejecutar `npm run dev`; la interfaz usa el mismo servidor en `127.0.0.1:8090`. `npm run dev:local` es un alias compatible.
5. Ejecutar `npm test` y `npm run build`. El resultado es `dist-local`; `npm run build:local` produce la misma aplicacion. La compilacion no necesita credenciales ni seleccion de backend.

Comprobacion aislada de API y navegador:

```shell
npm run build
npx playwright install chromium
python scripts/check_local.py tools-pb/pocketbase --browser
```

Para incluir HTTPS y recuperacion, seguir los comandos del [estado vigente](docs/mina-local-estado-integracion.md). El script crea y elimina su propia base temporal con datos ficticios.

## Reglas conservadas

- Sesion obligatoria, archivos privados y aislamiento por operador. Sin registro publico.
- Dos espacios de atencion, conflictos rechazados por el servidor y domingo como dia 0.
- Archivo de pacientes con historial conservado; notas, fotografias y seguimiento manual de WhatsApp.
- Carga fallida visible, sin cambiar a otro proveedor ni simular una agenda vacia.
- Guardado sin confirmar: comprobar despues de recargar antes de repetirlo.
- Respaldo completo cifrado y restauracion separada. CSV/JSON son exportaciones parciales; no importan ni recuperan el servidor.

## Historial y organizacion

- `src/`: unica interfaz clinica y cliente PocketBase.
- `local/pocketbase/pb_migrations`: migraciones vigentes; no reescribir las ya publicadas.
- `local/windows`: operacion del paquete, HTTPS y respaldos.
- `scripts` y `tests`: comprobaciones y empaquetado.
- `local/spike`: referencia independiente de integridad SQLite, solo para pruebas; no aplicar a PocketBase.
- [Archivo historico](docs/archive/README.md): decisiones anteriores y referencia Git del codigo retirado. La version anterior permanece en `main`, que no se modifica ni se fusiona durante este trabajo.

Las fuentes Geist y su licencia se incluyen en el paquete. El instalador, ventana y sesion se preparan como version candidata; ver [criterios de cierre](docs/entrega-mina-candidata.md). El cambio de logotipo por la imagen del consultorio sigue aplazado por el usuario.

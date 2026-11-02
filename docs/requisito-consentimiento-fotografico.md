# Requisito confirmado: fotografía del consentimiento firmado (Eduardo)

Estado: **solicitado por Eduardo**, pendiente de implementar después de asegurar autenticación, relaciones entre paciente y usuario y almacenamiento privado.

## Flujo esperado
1. En un expediente autenticado, abrir la sección **Consentimiento firmado**.
2. Eduardo puede tomar una fotografía con el celular o seleccionar una imagen existente.
3. El sistema muestra una vista previa y el **nombre + folio único + identificador de paciente** para confirmar que el documento corresponde a la persona correcta.
4. Antes de subir, verificar tipo real de archivo, extensión y límite de tamaño; rechazar archivos inesperados, metadatos sensibles innecesarios y contenidos inválidos. Evitar confiar únicamente en MIME enviado por el navegador.
5. Subir a un bucket **privado** de Supabase Storage con ruta segregada por usuario y paciente, identificador no predecible y políticas de Storage RLS que verifiquen propiedad; nunca almacenar el archivo en `public/` ni guardar la foto en `localStorage`.
6. Crear un registro de metadatos enlazado al paciente correcto (storage_path, uploaded_by, uploaded_at, document_type, checksum opcional y estatus). No guardar URL pública.
7. Consultar el documento mediante acceso autorizado, URL firmada de duración breve cuando corresponda y comprobación de pertenencia; prever revocación, auditoría y control de acceso en móvil y PC.
8. No sobrescribir silenciosamente un consentimiento previo: conservar historial/versiones según la política de retención aplicable.
9. Proteger contra errores de carga o conexión: un archivo parcial no puede mostrarse como documento guardado.
10. Acordar con Eduardo si solo se necesita **fotografía** o también PDF y si debe registrarse fecha de firma y versión del aviso. El checkbox de privacidad no sustituye una prueba de consentimiento ni prueba por sí solo el cumplimiento legal.

## Criterios de aceptación
- Cuenta B no puede listar, descargar, reemplazar ni borrar documentos de pacientes de cuenta A.
- Un paciente no puede recibir por error una imagen elegida para otro expediente.
- Una sesión cerrada no deja una imagen clínica visible y las URLs temporales no siguen siendo válidas indefinidamente.
- Una imagen no válida o demasiado grande muestra error sin crear un registro confirmado.
- Prueba de toma con cámara móvil y selección desde PC, usando únicamente imágenes ficticias.
- Registro y foto solo se consideran finalizados después de comprobar la escritura de archivo y metadatos.

## Fuera del alcance de la corrección de seguridad actual
No se crean buckets, políticas de Storage ni tablas de adjuntos en este parche. Requiere migración y pruebas aisladas antes de habilitar la función.

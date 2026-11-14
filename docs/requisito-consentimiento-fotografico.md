# Fotografia del consentimiento firmado

MINA Local integra esta funcion en el expediente original. No sustituye la custodia del documento firmado ni la revision del responsable.

1. Iniciar sesion y abrir el expediente correcto.
2. Seleccionar JPG, PNG o WebP de hasta 8 MB; se valida el tipo y firma del formato.
3. Revisar vista previa, nombre e identificador y confirmar que nombre, fecha y firma sean legibles y correspondan al paciente.
4. Guardar mediante PocketBase en `mina_patient_documents`, campo `signed_consent` protegido, con propietario y relacion al paciente.
5. Abrir mediante autorizacion y token temporal de archivo. No existe URL publica del expediente.
6. Conservar versiones/documentos previos y no ofrecer borrado irreversible ni sobrescritura silenciosa.
7. Verificar errores de carga y recuperar las fotografias junto con la base en una restauracion completa.

Pruebas: acceso anonimo y desde otro operador rechazado, persistencia en recarga, apertura privada y restauracion desde copia cifrada. El telefono/camara y la legibilidad con documentos reales requieren validacion del consultorio; usar datos ficticios hasta completarla.

Las imagenes no se guardan en almacenamiento del navegador. Las exportaciones CSV/JSON no las incluyen. PDF y cambios de campos legales requieren una decision adicional.

[Requisito original archivado](archive/requisito-consentimiento-fotografico.md).

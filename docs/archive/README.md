# Archivo de decisiones anteriores

Estos documentos se conservan como contexto historico. Describen la version cloud, la integracion retirada de calendario o prototipos previos; no son instrucciones para el programa local actual.

Estado vigente: [MINA Local](../mina-local-estado-integracion.md). Instalacion y recuperacion: [Windows](../mina-local-windows.md). Requisitos funcionales: [consultorio](../01-entrevista-y-requisitos.md).

El codigo anterior, esquemas/migraciones cloud y prototipo aislado se recuperan desde el historial Git en `177d0bd6f2f56cda5667c60d6e826a52909804e6`:
https://github.com/Chris-Vasconcelos/agendar_citas_fisio/tree/177d0bd6f2f56cda5667c60d6e826a52909804e6

No se duplican esos ejecutables ni sus servicios en el arbol activo. `main` no se modifica. Esta limpieza no conecta ni elimina datos de ningun proveedor remoto y no modifica los expedientes de una PC instalada.

`local/spike` se mantiene como referencia independiente de integridad SQLite y pruebas. Su esquema NO debe aplicarse a la base interna de PocketBase; las migraciones vigentes estan en `local/pocketbase/pb_migrations`.

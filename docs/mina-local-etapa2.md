# MINA Local — Etapa 2: prototipo PocketBase (en curso)

**Equipo definido:** escritorio Windows 11 Home; celular conectado al Wi-Fi interno del consultorio; respaldo en disco externo. Supabase y la rama main siguen intactos.

## Realizado en esta rama

- Migración PocketBase para cinco colecciones: mina_operators (auth sin registro público), mina_patients, mina_appointments, mina_availability y mina_patient_documents.
- Reglas de acceso por operador y por pertenencia del expediente al operador.
- Consentimientos en campo file con protected=true y límite 8 MB para JPG/PNG/WebP.
- Triggers en la propia base de datos que rechazan solapamientos de citas del mismo espacio o del mismo paciente, incluso entre dispositivos; rechazan rangos invertidos.
- Se bloquea borrado irreversible de pacientes y documentos (usar archivo del paciente). El propietario del paciente no puede cambiarse.
- Cliente HTTP experimental en src/local/pocketbaseClient.js con token en memoria (sin persistencia). **NO está conectado a la app React actual**.

## Límites y tareas obligatorias antes de instalar

El servidor PocketBase NO está entregado a Lalo. La configuración Windows, HTTPS LAN, acceso desde celular, creación del usuario inicial, pruebas cruzadas A/B, pruebas reales de concurrencia, cifrado del disco, copia desconectada y restauración en otro equipo siguen pendientes. No exponer este prototipo a la LAN ni utilizar datos clínicos.

El cliente experimental necesita paginación, manejo seguro de las sesiones, adaptación de payloads (incluidos IDs PocketBase frente a UUID Supabase), y una capa de archivos protegidos antes de integrarlo a MINA.

Las reglas de PocketBase no sustituyen la verificación de acceso anónimo y entre usuarios mediante solicitudes reales. PocketBase usa tokens de autenticación, no cookies de sesión.

## Verificación en GitHub Actions

El workflow local-pocketbase.yml baja temporalmente el ejecutable de **PocketBase 0.40.6** de GitHub Releases y ejecuta la migración sobre una base temporal. No se distribuye el binario con el repositorio. Versionar/verificar el binario y un proceso de actualización segura será necesario antes de producción. No ejecutar el esquema SQL independiente del directorio local/spike sobre PocketBase.

Comprobar después de esa ejecución los accesos reales, la creación de operador por proceso local y el comportamiento desde el celular real.

Documentación de referencia: https://pocketbase.io/docs/js-migrations/ y https://pocketbase.io/docs/api-rules-and-filters/ y https://pocketbase.io/docs/files-handling/

> HISTORICO: no usar como instrucciones de instalacion ni como estado vigente. Ver ../mina-local-estado-integracion.md y ../mina-local-windows.md.

# MINA Local — Etapa 1 (prototipo aislado)

**Decisión confirmada:** computadora **de escritorio con Windows 11 Home** como servidor, celular del responsable por Wi-Fi privado del consultorio y disco externo para respaldos. **Sin mensualidades de hosting**. Mantenimiento, electricidad y hardware siguen siendo gastos.

## Alcance y estado

Este directorio contiene un **esquema de referencia SQLite y pruebas de integridad**. NO es una implementación PocketBase, NO está conectado al React actual, NO crea servicio de Windows, NO expone una API LAN y NO habilita acceso al celular. No utilizar con pacientes reales.

La primera opción a evaluar para servidor local es **PocketBase**, con versión fijada y reglas/hooks auditados. Antes de comprometerse habrá que demostrar que conserva las garantías de las reglas de PostgreSQL y puede mantenerse de forma segura. Si no es adecuado, evaluar Fastify. El esquema SQLite aquí es una referencia de requisitos; no se debe aplicar directamente sobre la base interna de PocketBase ni crear tablas fuera de su sistema de migraciones.

## Inventario desde `main`

| Componente actual | Origen | Requisito local |
|---|---|---|
| Pacientes | `supabase/schema.sql` | Validar datos, consentimiento, archivo sin borrado |
| Citas | `supabase/schema.sql` | Dos espacios 1/2, rangos [inicio, fin), no cruzar espacios del mismo paciente, escritura atómica |
| Horarios | `supabase/schema.sql` | Lunes-domingo, un horario por día/usuario |
| Documentos firmados | `20261029_signed_consents.sql` | Archivo fuera del directorio público, acceso autenticado, restricción de borrado, hash |
| Seguimiento WhatsApp | `20261107_appointment_reminders.sql` | Estado manual abierto/enviado; consentimiento para mensajes |
| Respaldo JSON | `src/pages/SecurityPage.jsx` | No contiene fotografías; debe reemplazarse por paquete completo cifrado |
| Acceso | `src/lib/supabase.js` | Reemplazar Auth/RLS con autorización por solicitud y sesiones protegidas |

## Decisiones de diseño

- Mantener React/Vite y estilos; sustituir servicios **solo en una rama de migración posterior**.
- **Fuente única de datos en la PC:** el celular no mantiene otra base independiente. La PC debe permanecer encendida.
- Fechas: normalizar instantes al formato UTC `YYYY-MM-DDTHH:mm:ss.sssZ` antes de guardarlos; `<` lexical solo es válido en este formato uniforme.
- SQLite: habilitar `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000` en cada conexión real. Los triggers del esquema aislado impiden solapamientos a nivel de BD; no garantizan todavía seguridad de toda la aplicación.
- **Autenticación:** no abrir el servidor a la LAN hasta comprobar reglas de acceso y HTTPS sin advertencias en el celular real.
- **Windows 11 Home:** no dar por hecho BitLocker completo; comprobar `Cifrado de dispositivo` y compatibilidad del equipo. Si no es suficiente, elegir mecanismo de cifrado en reposo adecuado antes de datos reales.
- **Red:** SSID interno separado de visitantes, firewall solo red privada, acceso mínimo, IP reservada en router, ningún puerto abierto a internet.
- **Certificado:** evaluar CA local confiada por el teléfono real o dominio con validación DNS y HTTPS; `mkcert` en desarrollo no equivale a gestión de certificados de producción. Proteger la clave privada de CA; no guardarla en repo.
- **Energía:** PC escritorio: evaluar UPS y recuperación de energía BIOS; no prometer continuidad durante apagones.
- **Respaldo:** base activa en disco interno, disco externo solo para copias cifradas y verificadas; otra copia desconectada fuera del consultorio. Documentar ubicación y custodia de clave separadas de la PC.
- **No copiar** `src/lib/supabase.js` ni claves `.env` a la futura distribución local.

## Comprobación reproducible del esquema de referencia

Requiere Python 3 **solo en la máquina de desarrollo** (no en la PC final de Lalo). Desde la raíz del repositorio:

```shell
python -m unittest discover -s local/spike -p "test_*.py" -v
```

Las pruebas usan SQLite en memoria, datos ficticios y no conectan a Supabase. El futuro servidor PocketBase deberá superar además ensayos reales de concurrencia PC+celular, autenticación, fotos, recuperación y arranque de Windows. No instalar ni ejecutar este prototipo en producción.

## Criterios de entrada a etapa 2

1. PocketBase ejecutable con versión fijada, licencia y política de actualizaciones documentadas.
2. HTTPS en el **celular real** sin advertencias, sesión segura y archivo privado inaccessible sin sesión.
3. Dos citas en paralelo permitidas, tercera rechazada incluso con requests concurrentes.
4. Arranque automático real tras reiniciar Windows 11 Home.
5. Respaldo cifrado y restauración íntegra, probado en **otro equipo**.
6. Responsable de mantenimiento y procedimiento ante pérdida/robo/USB ausente acordados por escrito.

**Comportamiento temporal:** la rama principal sigue utilizando Supabase. No migrar datos ni desconectar el sistema previo hasta cerrar las compuertas locales.

## Limitaciones de la etapa 1

No se ha medido comportamiento HTTPS/LAN, ni cifrado del disco, ni recuperación en el equipo real. Las pruebas de esquema verifican reglas SQLite, no son pruebas de seguridad PocketBase. El plazo solo se estimará después del prototipo sobre el hardware del consultorio.

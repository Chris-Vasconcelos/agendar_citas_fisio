const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * Obtiene la zona horaria configurada o detectada en el dispositivo.
 */
export function getConfiguredTimeZone(customTimeZone) {
  if (customTimeZone && customTimeZone.trim()) {
    return customTimeZone.trim();
  }
  return (
    import.meta.env.VITE_DEFAULT_TIMEZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'America/Mexico_City'
  );
}

/**
 * Convierte el nombre completo del paciente a iniciales para proteger la privacidad
 * en notificaciones de pantalla bloqueada del celular.
 * Ejemplo: "María Fernanda López" -> "M. F. L."
 */
export function formatPatientInitials(fullName = '') {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'Paciente';
  return parts.map((part) => `${part[0].toUpperCase()}.`).join(' ');
}

/**
 * Genera el título del evento en Google Calendar respetando la preferencia de privacidad
 * e indicando el espacio/camilla (E1 o E2) ya que se atienden hasta 2 pacientes a la vez.
 */
export function buildGoogleEventSummary(patientName, useInitialsOnly = true, slotNumber = 1) {
  const display = useInitialsOnly ? formatPatientInitials(patientName) : patientName;
  return `Cita Fisio [E${slotNumber || 1}] - ${display}`;
}

/**
 * Genera un ID de evento determinista compatible con Google Calendar API (base32hex: a-v y 0-9).
 * Un UUID sin guiones contiene únicamente [0-9a-f], que es un subconjunto válido de base32hex.
 */
export function buildDeterministicGoogleEventId(appointmentId = '') {
  const cleanHex = String(appointmentId).toLowerCase().replace(/[^0-9a-f]/g, '');
  if (cleanHex.length >= 8) {
    return `fc${cleanHex}`;
  }
  return null;
}

/**
 * Busca si ya existe un evento en Google Calendar con extendedProperties.private.appointment_id
 * para evitar eventos duplicados al reintentar cuando se perdió la respuesta de red.
 */
export async function findExistingGoogleEventByAppointmentId(providerToken, appointmentId) {
  const params = new URLSearchParams({
    privateExtendedProperty: `appointment_id=${appointmentId}`,
    showDeleted: 'false',
    maxResults: '1',
  });

  const response = await fetch(`${GOOGLE_CALENDAR_API}?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${providerToken}`,
    },
  });

  if (response.status === 401) {
    return { ok: false, authExpired: true, httpStatus: 401 };
  }

  if (!response.ok) {
    return { ok: false, httpStatus: response.status };
  }

  const data = await response.json();
  const existing = Array.isArray(data.items) && data.items.length > 0 ? data.items[0] : null;
  return { ok: true, event: existing };
}

/**
 * Crea o actualiza de forma idempotente un evento en Google Calendar.
 * - Incluye timeZone explícito en start y end.
 * - Guarda appointment_id en extendedProperties.private.
 * - Evita duplicados si se reintenta una cita cuya respuesta previa se perdió.
 * - Detecta error 401 para activar el botón "Reconectar Google".
 */
export async function upsertGoogleCalendarEvent({
  providerToken,
  appointment,
  patientName,
  useInitialsOnly = true,
  timeZone,
}) {
  if (!providerToken) {
    return {
      ok: false,
      authExpired: true,
      httpStatus: 401,
      errorCode: 'MISSING_GOOGLE_TOKEN',
      errorDetail: 'Token de Google no disponible en la sesión actual. Reconecta tu cuenta de Google.',
    };
  }

  const resolvedTimeZone = getConfiguredTimeZone(timeZone);
  const summary = buildGoogleEventSummary(
    patientName,
    useInitialsOnly,
    appointment.slot_number || 1
  );

  const eventPayload = {
    summary,
    description: 'Cita agendada desde FisioCitas (sin datos clínicos por privacidad).',
    start: {
      dateTime: new Date(appointment.start_time).toISOString(),
      timeZone: resolvedTimeZone,
    },
    end: {
      dateTime: new Date(appointment.end_time).toISOString(),
      timeZone: resolvedTimeZone,
    },
    status: 'confirmed',
    extendedProperties: {
      private: {
        appointment_id: String(appointment.id),
      },
    },
  };

  try {
    let targetGoogleEventId = appointment.google_event_id || null;

    // Paso 1: Si aún no tenemos google_event_id guardado (ej. en un reintento),
    // verificamos primero si Google ya tiene el evento por privateExtendedProperty.
    if (!targetGoogleEventId) {
      const lookup = await findExistingGoogleEventByAppointmentId(providerToken, appointment.id);
      if (lookup.authExpired) {
        return {
          ok: false,
          authExpired: true,
          httpStatus: 401,
          errorCode: 'GOOGLE_TOKEN_EXPIRED',
          errorDetail: 'La sesión de Google Calendar expiró (HTTP 401). Reconecta Google.',
        };
      }
      if (lookup.ok && lookup.event?.id) {
        targetGoogleEventId = lookup.event.id;
      }
    }

    // Paso 2: Si ya existe targetGoogleEventId, actualizamos con PATCH.
    if (targetGoogleEventId) {
      const updateResponse = await fetch(
        `${GOOGLE_CALENDAR_API}/${encodeURIComponent(targetGoogleEventId)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        }
      );

      if (updateResponse.status === 401) {
        return {
          ok: false,
          authExpired: true,
          httpStatus: 401,
          errorCode: 'GOOGLE_TOKEN_EXPIRED',
          errorDetail: 'La autorización de Google expiró (HTTP 401).',
        };
      }

      if (updateResponse.ok) {
        const updatedEvent = await updateResponse.json();
        return {
          ok: true,
          googleEventId: updatedEvent.id,
          httpStatus: updateResponse.status,
        };
      }
    }

    // Paso 3: Crear evento nuevo usando ID determinista base32hex para idempotencia
    const deterministicId = buildDeterministicGoogleEventId(appointment.id);
    const createPayload = deterministicId ? { id: deterministicId, ...eventPayload } : eventPayload;

    const createResponse = await fetch(GOOGLE_CALENDAR_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    if (createResponse.status === 401) {
      return {
        ok: false,
        authExpired: true,
        httpStatus: 401,
        errorCode: 'GOOGLE_TOKEN_EXPIRED',
        errorDetail: 'La autorización de Google expiró (HTTP 401).',
      };
    }

    // Si Google devuelve 409 Conflict (el ID determinista ya existía en Google Calendar),
    // lo actualizamos/reactivamos con PUT para no duplicar.
    if (createResponse.status === 409 && deterministicId) {
      const putResponse = await fetch(
        `${GOOGLE_CALENDAR_API}/${encodeURIComponent(deterministicId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        }
      );

      if (putResponse.ok) {
        const recoveredEvent = await putResponse.json();
        return {
          ok: true,
          googleEventId: recoveredEvent.id,
          httpStatus: putResponse.status,
        };
      }
    }

    if (!createResponse.ok) {
      return {
        ok: false,
        authExpired: false,
        httpStatus: createResponse.status,
        errorCode: `GOOGLE_HTTP_${createResponse.status}`,
        errorDetail: `Google Calendar devolvió estado HTTP ${createResponse.status}.`,
      };
    }

    const createdEvent = await createResponse.json();
    return {
      ok: true,
      googleEventId: createdEvent.id,
      httpStatus: createResponse.status,
    };
  } catch (err) {
    return {
      ok: false,
      authExpired: false,
      httpStatus: 0,
      errorCode: 'NETWORK_ERROR',
      errorDetail: err?.message || 'Error de conexión al comunicarse con Google Calendar.',
    };
  }
}

/**
 * Cancela/elimina un evento en Google Calendar cuando la cita se cancela en la app.
 */
export async function cancelGoogleCalendarEvent({ providerToken, googleEventId }) {
  if (!googleEventId) {
    return { ok: true, httpStatus: 200 };
  }
  if (!providerToken) {
    return {
      ok: false,
      authExpired: true,
      httpStatus: 401,
      errorCode: 'MISSING_GOOGLE_TOKEN',
      errorDetail: 'Token de Google no disponible para cancelar el evento en Google Calendar.',
    };
  }

  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/${encodeURIComponent(googleEventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (response.status === 401) {
      return {
        ok: false,
        authExpired: true,
        httpStatus: 401,
        errorCode: 'GOOGLE_TOKEN_EXPIRED',
        errorDetail: 'La autorización de Google expiró (HTTP 401).',
      };
    }

    // 204 No Content, 200 OK, o 404/410 (ya estaba eliminado en Google) se consideran completados
    if (response.ok || response.status === 404 || response.status === 410) {
      return { ok: true, httpStatus: response.status };
    }

    return {
      ok: false,
      authExpired: false,
      httpStatus: response.status,
      errorCode: `GOOGLE_DELETE_${response.status}`,
      errorDetail: `No se pudo eliminar en Google Calendar (HTTP ${response.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      authExpired: false,
      httpStatus: 0,
      errorCode: 'NETWORK_ERROR',
      errorDetail: err?.message || 'Error de red al cancelar evento en Google Calendar.',
    };
  }
}

/**
 * Verifica las citas activas contra Google Calendar SIN sobrescribir la base de datos.
 * Devuelve únicamente una lista de avisos/discrepancias para que el fisioterapeuta decida.
 */
export async function verifyGoogleCalendarDiscrepancies({
  providerToken,
  appointments = [],
  timeMinISO,
  timeMaxISO,
}) {
  if (!providerToken) {
    return {
      ok: false,
      authExpired: true,
      httpStatus: 401,
      discrepancies: [],
    };
  }

  const activeSyncedAppointments = appointments.filter(
    (apt) => apt.status === 'scheduled' && apt.sync_status === 'synced' && apt.google_event_id
  );

  if (activeSyncedAppointments.length === 0) {
    return { ok: true, discrepancies: [] };
  }

  try {
    const params = new URLSearchParams({
      timeMin: timeMinISO,
      timeMax: timeMaxISO,
      singleEvents: 'true',
      showDeleted: 'true',
      maxResults: '250',
    });

    const response = await fetch(`${GOOGLE_CALENDAR_API}?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (response.status === 401) {
      return {
        ok: false,
        authExpired: true,
        httpStatus: 401,
        discrepancies: [],
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        authExpired: false,
        httpStatus: response.status,
        discrepancies: [],
      };
    }

    const data = await response.json();
    const googleEvents = Array.isArray(data.items) ? data.items : [];
    const byId = new Map(googleEvents.map((ev) => [ev.id, ev]));

    const discrepancies = [];

    for (const apt of activeSyncedAppointments) {
      const gEvent = byId.get(apt.google_event_id);

      if (!gEvent || gEvent.status === 'cancelled') {
        discrepancies.push({
          appointmentId: apt.id,
          googleEventId: apt.google_event_id,
          type: 'deleted_in_google',
          message:
            'Este evento fue borrado en Google Calendar, pero sigue activo en tu agenda.',
          dbStart: apt.start_time,
          dbEnd: apt.end_time,
          googleStart: null,
          googleEnd: null,
        });
        continue;
      }

      const gStartMs = gEvent.start?.dateTime ? new Date(gEvent.start.dateTime).getTime() : null;
      const gEndMs = gEvent.end?.dateTime ? new Date(gEvent.end.dateTime).getTime() : null;
      const dbStartMs = new Date(apt.start_time).getTime();
      const dbEndMs = new Date(apt.end_time).getTime();

      if (
        gStartMs !== null &&
        gEndMs !== null &&
        (Math.abs(gStartMs - dbStartMs) > 60_000 || Math.abs(gEndMs - dbEndMs) > 60_000)
      ) {
        discrepancies.push({
          appointmentId: apt.id,
          googleEventId: apt.google_event_id,
          type: 'moved_in_google',
          message:
            'El horario de este evento fue modificado directamente en Google Calendar.',
          dbStart: apt.start_time,
          dbEnd: apt.end_time,
          googleStart: gEvent.start.dateTime,
          googleEnd: gEvent.end.dateTime,
        });
      }
    }

    return { ok: true, discrepancies };
  } catch (err) {
    return {
      ok: false,
      authExpired: false,
      httpStatus: 0,
      errorDetail: err?.message,
      discrepancies: [],
    };
  }
}

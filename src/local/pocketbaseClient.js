// Same-origin API only. No clinical records are persisted in browser storage.
const ROOT = '/api/collections/';
const SESSION_KEY = 'mina_local_session_token';
let auth = null;
let token = '';
let epoch = 0;
let expiryTimer;
let refreshPromise;
let uncertainWrite = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(auth));
export const localCurrentUser = () => auth;
export const localSubscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
function storeToken(value) {
  try {
    if (value) sessionStorage.setItem(SESSION_KEY, value);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Memory-only session if browser storage is unavailable. */ }
}
export function localSignOut() {
  epoch++;
  clearTimeout(expiryTimer);
  token = ''; auth = null; refreshPromise = null;
  storeToken(''); notify();
}
function expiresAt(value) {
  try {
    const part = value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).exp * 1000;
  } catch { return 0; }
}
function acceptSession(data) {
  if (!data?.record?.id || !data.token || !(expiresAt(data.token) > Date.now())) {
    localSignOut(); throw new Error('La sesión recibida no es válida.');
  }
  token = data.token;
  auth = { id: data.record.id, email: data.record.email };
  storeToken(token);
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(localSignOut, Math.min(expiresAt(token) - Date.now(), 2147483647));
  expiryTimer.unref?.();
  notify();
  return auth;
}
function requireSession() {
  if (!token || expiresAt(token) <= Date.now()) {
    localSignOut(); throw new Error('La sesión terminó. Inicia sesión nuevamente.');
  }
}
async function http(path, { method = 'GET', payload, mutation = false } = {}) {
  if (mutation && uncertainWrite) throw new Error('Hay un guardado sin confirmar. Recarga y revisa los datos antes de continuar.');
  const requestEpoch = epoch;
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = token;
  const multipart = payload instanceof FormData;
  if (payload !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response, result;
  try {
    response = await fetch(path, { method, headers, cache: 'no-store', credentials: 'omit', signal: controller.signal,
      ...(payload === undefined ? {} : { body: multipart ? payload : JSON.stringify(payload) }) });
    result = await response.json();
  } catch {
    if (mutation) uncertainWrite = true;
    throw new Error(mutation
      ? 'No se pudo confirmar el guardado. Recarga y comprueba si aparece antes de repetirlo.'
      : 'No se pudo consultar el servidor del consultorio. Comprueba la conexión y vuelve a intentar.');
  } finally { clearTimeout(timer); }
  if (requestEpoch !== epoch) throw new Error('La sesión cambió. La respuesta anterior fue descartada.');
  if (!response.ok) {
    if (response.status === 401) localSignOut();
    throw new Error(response.status === 401 || response.status === 403
      ? 'Acceso denegado o sesión expirada.'
      : 'El servidor rechazó la operación. Revisa los datos y, si es una cita, que el horario esté libre.');
  }
  return result;
}
export async function localSignIn(email, password) {
  localSignOut();
  return acceptSession(await http(ROOT + 'mina_operators/auth-with-password', {
    method: 'POST', payload: { identity: email, password },
  }));
}
export async function localRefreshSession() {
  requireSession();
  if (!refreshPromise) {
    const promise = http(ROOT + 'mina_operators/auth-refresh', { method: 'POST' }).then(acceptSession);
    refreshPromise = promise;
    promise.finally(() => { if (refreshPromise === promise) refreshPromise = null; }).catch(() => {});
  }
  return refreshPromise;
}
export async function localRestoreSession() {
  // StrictMode can mount twice; share the refresh instead of resetting the session.
  if (refreshPromise) return refreshPromise;
  if (!token) { try { token = sessionStorage.getItem(SESSION_KEY) || ''; } catch {} }
  if (!token) return null;
  if (expiresAt(token) <= Date.now()) { localSignOut(); return null; }
  try { return await localRefreshSession(); }
  catch (error) { if (!token) return null; throw error; }
}
async function list(name, sort = 'id', filter = '') {
  // PocketBase list rules can return 200 with zero items for an invalid session.
  // Validate against auth-refresh first; never infer authentication from a list.
  await localRefreshSession();
  const records = [];
  for (let page = 1; page <= 1000; page++) {
    requireSession();
    const params = new URLSearchParams({ page: String(page), perPage: '200', sort, filter });
    const data = await http(ROOT + name + '/records?' + params);
    if (!Array.isArray(data?.items) || !Number.isInteger(data.totalPages)) throw new Error('Respuesta de datos inválida.');
    records.push(...data.items);
    if (page >= data.totalPages) return records;
  }
  throw new Error('La consulta excedió el límite. Contacta al responsable del sistema.');
}
async function write(name, payload, id) {
  await localRefreshSession();
  return http(ROOT + name + '/records' + (id ? '/' + encodeURIComponent(id) : ''), {
    method: id ? 'PATCH' : 'POST', payload, mutation: true,
  });
}
const pick = (value, keys) => Object.fromEntries(keys.filter((k) => value[k] !== undefined).map((k) => [k, value[k]]));
const iso = (value) => value ? new Date(value.replace(' ', 'T')).toISOString() : null;
const patientMap = (p) => ({ ...p, email: p.email_address || null, user_id: p.owner });
const appointmentMap = (a) => ({ ...a, patient_id: a.patient, user_id: a.owner, start_time: iso(a.start_time), end_time: iso(a.end_time) });
const patientFields = ['full_name', 'age', 'phone', 'allergies', 'previous_studies', 'family_history', 'consultation_reason', 'privacy_consent', 'privacy_consent_at'];
export const localPatientApi = {
  list: async () => (await list('mina_patients', 'full_name')).map(patientMap),
  save: async (p, id) => {
    await localRefreshSession();
    const fields = pick(p, patientFields);
    if ('email' in p) fields.email_address = p.email || '';
    return patientMap(await write('mina_patients', { ...fields, owner: auth.id }, id));
  },
  archive: async (id, archived = true) => patientMap(await write('mina_patients', { archived_at: archived ? new Date().toISOString() : '' }, id)),
};
export const localAppointmentApi = {
  list: async () => (await list('mina_appointments', 'start_time')).map(appointmentMap),
  save: async (p, id) => {
    await localRefreshSession();
    return appointmentMap(await write('mina_appointments', {
      ...pick(p, ['slot_number', 'start_time', 'end_time', 'status', 'patient_condition', 'treatment_notes', 'professional_name']),
      owner: auth.id, patient: p.patient_id,
    }, id));
  },
  cancel: async (id) => appointmentMap(await write('mina_appointments', { status: 'cancelled' }, id)),
};
export const localAvailabilityApi = {
  list: () => list('mina_availability', 'day_of_week'),
  save: async (p) => {
    const existing = (await list('mina_availability', 'day_of_week')).find((x) => Number(x.day_of_week) === Number(p.day_of_week));
    return write('mina_availability', { ...pick(p, ['day_of_week', 'start_time', 'end_time', 'slot_duration_minutes', 'is_active']), owner: auth.id }, existing?.id);
  },
};
const documentMap = (d) => ({ ...d, patient_id: d.patient, uploaded_at: iso(d.created), storage_path: { id: d.id, filename: d.signed_consent } });
export const localConsentApi = {
  list: async (patientId) => (await list('mina_patient_documents', '-created', 'patient=' + JSON.stringify(patientId))).map(documentMap),
  upload: async ({ patientId, file }) => {
    await localRefreshSession();
    const data = new FormData();
    data.set('owner', auth.id); data.set('patient', patientId); data.set('document_type', 'signed_consent');
    data.set('signed_consent', file);
    return documentMap(await write('mina_patient_documents', data));
  },
  open: async ({ id, filename }) => {
    await localRefreshSession();
    const result = await http('/api/files/token', { method: 'POST' });
    if (!result?.token) throw new Error('No se pudo autorizar la fotografía.');
    return '/api/files/mina_patient_documents/' + encodeURIComponent(id) + '/' + encodeURIComponent(filename) + '?token=' + encodeURIComponent(result.token);
  },
};
const reminderMap = (r) => ({ ...r, appointment_id: r.appointment, appointment_start_time: iso(r.appointment_start_time) });
export const localReminderApi = {
  list: async () => (await list('mina_appointment_reminders')).map(reminderMap),
  save: async (appointmentId, startTime, status) => {
    if (!['opened', 'confirmed_sent'].includes(status)) throw new Error('Estado no válido.');
    const existing = (await list('mina_appointment_reminders', 'id', 'appointment=' + JSON.stringify(appointmentId)))[0];
    const timestamp = new Date().toISOString();
    return reminderMap(await write('mina_appointment_reminders', {
      owner: auth.id, appointment: appointmentId, appointment_start_time: startTime, status,
      ...(status === 'opened' ? { opened_at: timestamp, confirmed_at: '' } : { confirmed_at: timestamp }),
    }, existing?.id));
  },
};

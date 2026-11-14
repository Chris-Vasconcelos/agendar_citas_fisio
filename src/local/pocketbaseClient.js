// Same-origin API only. No clinical records are persisted in browser storage.
const ROOT = '/api/collections/';
import { WORKDAY_MS, SESSION_KEY, REMEMBER_KEY, readSessionRecord, sessionDue } from './sessionPolicy.js';
let auth = null;
let token = '';
let epoch = 0;
let expiryTimer;
let refreshPromise;
let uncertainWrite = false;
let sessionRecord = null;
let locked = false;
let lastPersistedAt = 0;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(auth));
export const localCurrentUser = () => auth;
export const localSessionEpoch = () => epoch;
export const localSubscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const localSessionState = () => ({ locked, remembered: Boolean(sessionRecord?.remember) });
function persistSession() {
  if (!sessionRecord || !token) return;
  lastPersistedAt = Date.now();
  sessionRecord = { ...sessionRecord, token, locked };
  try {
    (sessionRecord.remember ? localStorage : sessionStorage).setItem(
      sessionRecord.remember ? REMEMBER_KEY : SESSION_KEY, JSON.stringify(sessionRecord));
  } catch { /* Session remains usable in memory if storage is blocked. */ }
}
export function localSignOut({ clearPersistent = true } = {}) {
  epoch++;
  clearTimeout(expiryTimer);
  token = ''; auth = null; refreshPromise = null; sessionRecord = null; locked = false;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  if (clearPersistent) { try { localStorage.removeItem(REMEMBER_KEY); } catch {} }
  notify();
}
export function localLockSession() {
  if (!auth || locked) return;
  locked = true; persistSession(); notify();
}
export function localCheckSession(now = Date.now()) {
  if (!auth || !sessionRecord) return;
  if (sessionDue(sessionRecord, now) === 'expired' || expiresAt(token) <= now) localSignOut();
  else if (sessionDue(sessionRecord, now) === 'locked') localLockSession();
}
export function localTouchSession(now = Date.now()) {
  localCheckSession(now);
  if (!auth || locked || !sessionRecord) return;
  const persist = now - lastPersistedAt >= 15000;
  sessionRecord.lastActivity = now;
  if (persist) persistSession();
}
export function localStorageChanged(event) {
  if (event.key !== REMEMBER_KEY || !sessionRecord?.remember) return;
  const other = readSessionRecord(event.newValue);
  if (!other || other.sessionId !== sessionRecord.sessionId) {
    localSignOut({ clearPersistent: false }); return;
  }
  sessionRecord.lastActivity = Math.max(sessionRecord.lastActivity, other.lastActivity);
  if (other.locked) { locked = true; notify(); }
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
  if (!sessionRecord || sessionRecord.until <= Date.now()) {
    localSignOut(); throw new Error('La jornada terminó. Inicia sesión nuevamente.');
  }
  token = data.token;
  auth = { id: data.record.id, email: data.record.email };
  sessionRecord.until = Math.min(sessionRecord.until, expiresAt(token));
  locked = sessionDue(sessionRecord) === 'locked';
  persistSession();
  clearTimeout(expiryTimer);
  expiryTimer = setTimeout(localSignOut, Math.min(sessionRecord.until - Date.now(), expiresAt(token) - Date.now(), 2147483647));
  expiryTimer.unref?.();
  notify();
  return auth;
}
function requireSession() {
  localCheckSession();
  if (locked) throw new Error('MINA está bloqueada. Desbloquea tu sesión para continuar.');
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
      : path.endsWith('/auth-with-password')
        ? 'No se pudo entrar. Revisa el correo y la contraseña de tu cuenta de MINA.'
        : 'El servidor rechazó la operación. Revisa los datos y, si es una cita, que el horario esté libre.');
  }
  return result;
}
export async function localSignIn(email, password, rememberDevice = false) {
  localSignOut();
  const data = await http(ROOT + 'mina_operators/auth-with-password', {
    method: 'POST', payload: { identity: email, password },
  });
  const now = Date.now();
  sessionRecord = { until: now + WORKDAY_MS, lastActivity: now, remember: Boolean(rememberDevice),
    sessionId: crypto.randomUUID(), locked: false };
  return acceptSession(data);
}
export async function localUnlockSession(password) {
  if (!auth || !locked || !sessionRecord) throw new Error('La sesión no está bloqueada.');
  const owner = auth.id;
  const currentEpoch = epoch;
  const data = await http(ROOT + 'mina_operators/auth-with-password', {
    method: 'POST', payload: { identity: auth.email, password },
  });
  if (currentEpoch !== epoch || data?.record?.id !== owner) throw new Error('La cuenta cambió. Inicia sesión nuevamente.');
  if (sessionRecord.until <= Date.now()) { localSignOut(); throw new Error('La jornada terminó. Inicia sesión nuevamente.'); }
  locked = false;
  sessionRecord.locked = false;
  sessionRecord.lastActivity = Date.now();
  return acceptSession(data);
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
  if (refreshPromise) return refreshPromise;
  if (token && auth) return auth;
  let raw;
  try { raw = sessionStorage.getItem(SESSION_KEY); } catch {}
  sessionRecord = readSessionRecord(raw);
  if (!sessionRecord) { try { sessionRecord = readSessionRecord(localStorage.getItem(REMEMBER_KEY)); } catch {} }
  if (!sessionRecord) { localSignOut(); return null; }
  token = sessionRecord.token;
  if (expiresAt(token) <= Date.now()) { localSignOut(); return null; }
  // Validate on the server before revealing either the screen or the locked identity.
  const promise = http(ROOT + 'mina_operators/auth-refresh', { method: 'POST' }).then(acceptSession);
  refreshPromise = promise;
  try { return await promise; }
  catch (error) { if (!token) return null; throw error; }
  finally { if (refreshPromise === promise) refreshPromise = null; }
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

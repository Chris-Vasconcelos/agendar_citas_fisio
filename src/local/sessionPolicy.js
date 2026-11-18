// Authentication metadata only. Clinical records and passwords never go to storage.
export const WORKDAY_MS = 8 * 60 * 60 * 1000;
export const IDLE_MS = 10 * 60 * 1000;
export const SESSION_KEY = 'mina_local_session_token';
export const REMEMBER_KEY = 'mina_local_remembered_session_v1';
export function readSessionRecord(raw, now = Date.now()) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (typeof value.token !== 'string' || typeof value.sessionId !== 'string' ||
        !Number.isFinite(value.until) || !Number.isFinite(value.lastActivity) ||
        value.until <= now || value.until > now + WORKDAY_MS || value.lastActivity > now) return null;
    return value;
  } catch { return null; }
}
export const sessionDue = (record, now = Date.now()) => now >= record.until ? 'expired'
  : record.locked || now - record.lastActivity >= IDLE_MS ? 'locked' : 'active';

import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKDAY_MS, IDLE_MS, readSessionRecord, sessionDue } from '../src/local/sessionPolicy.js';

test('stored session rejects corruption, past deadlines and clock rollback', () => {
  const now = Date.now();
  const record = { token: 'token', sessionId: 'fixture', until: now + WORKDAY_MS, lastActivity: now };
  assert.ok(readSessionRecord(JSON.stringify(record), now));
  for (const value of ['bad json', JSON.stringify({ ...record, until: now }), JSON.stringify({ ...record, until: now + WORKDAY_MS + 1 }), JSON.stringify({ ...record, lastActivity: now + 1 })]) {
    assert.equal(readSessionRecord(value, now), null);
  }
  assert.equal(sessionDue(record, now), 'active');
  assert.equal(sessionDue(record, now + IDLE_MS), 'locked');
  assert.equal(sessionDue(record, record.until), 'expired');
});

const storage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key,value) => values.set(key,value), removeItem: (key) => values.delete(key), clear: () => values.clear() };
};
const jwt = () => 'x.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+28800 })).toString('base64url') + '.x';
const session = () => ({ token: jwt(), record: { id: 'owner0000000001', email: 'fixture@example.invalid' } });
const ok = () => new Response(JSON.stringify(session()), { status: 200 });
const client = () => import('../src/local/pocketbaseClient.js?' + Math.random());

test('remembered login restores only after validation, locks after idle, and unlocks same owner without a new lifetime', async () => {
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage();
  globalThis.fetch = async () => ok();
  const first = await client();
  await first.localSignIn('fixture@example.invalid', 'not-a-real-password', true);
  const saved = JSON.parse(localStorage.getItem('mina_local_remembered_session_v1'));
  assert.ok(saved.token); assert.ok(!JSON.stringify(saved).includes('not-a-real-password'));
  assert.equal(sessionStorage.getItem('mina_local_session_token'), null);
  saved.lastActivity -= IDLE_MS + 1;
  localStorage.setItem('mina_local_remembered_session_v1', JSON.stringify(saved));
  const restored = await client(); let validations = 0;
  globalThis.fetch = async (path) => { assert.match(path, /auth-refresh/); validations++; return ok(); };
  await restored.localRestoreSession();
  assert.equal(validations, 1); assert.equal(restored.localSessionState().locked, true);
  const epoch = restored.localSessionEpoch();
  await assert.rejects(restored.localPatientApi.list(), /bloqueada/);
  assert.equal(validations, 1);
  globalThis.fetch = async () => new Response('{}', { status: 400 });
  await assert.rejects(restored.localUnlockSession('wrong'), /correo y la contraseña/);
  assert.equal(restored.localSessionState().locked, true);
  globalThis.fetch = async () => ok();
  await restored.localUnlockSession('correct');
  assert.equal(restored.localSessionState().locked, false);
  assert.equal(restored.localSessionEpoch(), epoch);
  assert.equal(JSON.parse(localStorage.getItem('mina_local_remembered_session_v1')).until, saved.until);
  restored.localCheckSession(saved.until + 1);
  assert.equal(restored.localSessionState().locked, true);
  assert.ok(restored.localCurrentUser());
  await assert.rejects(restored.localPatientApi.list(), /bloqueada/);
  const realNow = Date.now;
  try {
    Date.now = () => saved.until + 2;
    globalThis.fetch = async () => ok();
    await restored.localUnlockSession('fresh-password');
    assert.equal(restored.localSessionState().locked, false);
    assert.equal(restored.localSessionEpoch(), epoch);
    assert.ok(JSON.parse(localStorage.getItem('mina_local_remembered_session_v1')).until > saved.until);
  } finally { Date.now = realNow; }
  restored.localSignOut();
  assert.equal(localStorage.getItem('mina_local_remembered_session_v1'), null);
  first.localSignOut();
});

test('default session stays tab-scoped and another window cannot silently replace the logged-in account', async () => {
  globalThis.localStorage = storage(); globalThis.sessionStorage = storage();
  globalThis.fetch = async () => ok();
  const api = await client();
  await api.localSignIn('fixture@example.invalid','private');
  assert.equal(localStorage.getItem('mina_local_remembered_session_v1'), null);
  assert.ok(sessionStorage.getItem('mina_local_session_token'));
  await api.localSignIn('fixture@example.invalid','private',true);
  const other = JSON.parse(localStorage.getItem('mina_local_remembered_session_v1'));
  other.sessionId = 'another-login';
  localStorage.setItem('mina_local_remembered_session_v1', JSON.stringify(other));
  api.localStorageChanged({ key:'mina_local_remembered_session_v1', newValue:JSON.stringify(other) });
  assert.equal(api.localCurrentUser(), null);
  assert.equal(JSON.parse(localStorage.getItem('mina_local_remembered_session_v1')).sessionId, 'another-login');
  api.localSignOut();
});

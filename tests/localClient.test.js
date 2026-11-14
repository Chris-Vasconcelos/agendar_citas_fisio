import test from 'node:test';
import assert from 'node:assert/strict';
const jwt = () => 'x.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.x';
const session = () => ({ token: jwt(), record: { id: 'owner0000000001', email: 'test@example.invalid' } });
const ok = (data) => new Response(JSON.stringify(data), { status: 200 });
async function client() { return import('../src/local/pocketbaseClient.js?' + Math.random()); }

test('validates session before listing; revoked auth cannot become empty agenda', async () => {
  const api = await client(); let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? ok(session()) : new Response('{}', { status: 401 });
  await api.localSignIn('test', 'test');
  await assert.rejects(api.localPatientApi.list(), /sesión/);
  assert.equal(calls, 2); assert.equal(api.localCurrentUser(), null);
});
test('loads every page and maps patient fields', async () => {
  const api = await client();
  globalThis.fetch = async (path) => {
    if (path.includes('auth-')) return ok(session());
    const page = Number(new URL(path, 'http://local').searchParams.get('page'));
    return ok({ items: [{ id: String(page), email_address: 'patient@example.invalid', owner: 'o' }], totalPages: 2 });
  };
  await api.localSignIn('test', 'test');
  const data = await api.localPatientApi.list();
  assert.deepEqual(data.map((p) => p.id), ['1', '2']); assert.equal(data[0].email, 'patient@example.invalid');
  api.localSignOut();
});
test('logout invalidates in-flight data responses', async () => {
  const api = await client(); let release; let started;
  const ready = new Promise((resolve) => { started = resolve; });
  globalThis.fetch = async (path) => {
    if (path.includes('auth-')) return ok(session());
    started(); return new Promise((resolve) => { release = resolve; });
  };
  await api.localSignIn('test', 'test');
  const request = api.localPatientApi.list();
  await ready; api.localSignOut(); release(ok({ items: [{ id: 'sensitive' }], totalPages: 1 }));
  await assert.rejects(request, /descartada/);
});
test('ambiguous writes block a second mutation until reload', async () => {
  const api = await client(); let writes = 0;
  globalThis.fetch = async (path) => {
    if (path.includes('auth-')) return ok(session());
    writes++; throw new TypeError('Response lost');
  };
  await api.localSignIn('test', 'test');
  await assert.rejects(api.localPatientApi.save({ full_name: 'Ficticio' }), /confirmar el guardado/);
  await assert.rejects(api.localPatientApi.save({ full_name: 'Ficticio' }), /guardado sin confirmar/);
  assert.equal(writes, 1); api.localSignOut();
});

test('login epochs distinguish logout and same-account re-entry but preserve routine refresh', async () => {
  const api = await client();
  globalThis.fetch = async () => ok(session());
  await api.localSignIn('test', 'test');
  const firstLogin = api.localSessionEpoch();
  await api.localRefreshSession();
  assert.equal(api.localSessionEpoch(), firstLogin);
  api.localSignOut();
  assert.ok(api.localSessionEpoch() > firstLogin);
  await api.localSignIn('test', 'test');
  assert.ok(api.localSessionEpoch() > firstLogin);
  api.localSignOut();
});

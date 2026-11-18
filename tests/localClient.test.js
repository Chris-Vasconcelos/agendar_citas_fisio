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

test('a 5xx write is uncertain and cannot be repeated blindly', async () => {
  const api = await client(); let writes = 0;
  globalThis.fetch = async (path) => {
    if (path.includes('auth-')) return ok(session());
    writes++; return new Response('{}', {status:503});
  };
  await api.localSignIn('test','test');
  await assert.rejects(api.localPatientApi.save({full_name:'Ficticio'}), /confirmar el guardado/);
  await assert.rejects(api.localPatientApi.save({full_name:'Ficticio'}), /guardado sin confirmar/);
  assert.equal(writes,1); api.localSignOut();
});
test('a stale edit explains the conflict without replacing its captured version', async () => {
  const api = await client(); let submitted;
  globalThis.fetch = async (path, options) => {
    if (path.includes('auth-')) return ok(session());
    if (options.method === 'PATCH') { submitted=JSON.parse(options.body); return new Response('{}',{status:400}); }
    return ok({id:'patient',write_version:'newer-version'});
  };
  await api.localSignIn('test','test');
  await assert.rejects(api.localPatientApi.save({full_name:'Ficticio',write_version:'captured-old'},'patient'), /cambió en otra ventana/);
  assert.equal(submitted.previous_version,'captured-old');
  assert.notEqual(submitted.write_version,'captured-old'); api.localSignOut();
});

for (const failure of ['network', 'invalid JSON']) test(`an old ${failure} failure cannot block writes in the new account`, async () => {
  const api = await client(); let owner='account-a', failOld, signal;
  const dispatched=new Promise(resolve=>{signal=resolve;});
  globalThis.fetch=async(path, options)=>{
    if(path.includes('auth-')) return ok({token:jwt(),record:{id:owner,email:owner+'@example.invalid'}});
    const payload=JSON.parse(options.body);
    if(payload.full_name==='Pending account A') {signal();return new Promise((resolve,reject)=>{failOld=()=>failure==='network' ? reject(new TypeError('Old response lost')) : resolve(new Response('Unreadable old response'));});}
    return ok({id:'patient-b',owner,full_name:payload.full_name});
  };
  await api.localSignIn('a','test');
  const oldResult=api.localPatientApi.save({full_name:'Pending account A'}).catch(error=>error);
  await dispatched;api.localSignOut();owner='account-b';await api.localSignIn('b','test');
  failOld();
  const oldError=await oldResult;
  try {
    const saved=await api.localPatientApi.save({full_name:'Valid account B'});
    assert.equal(saved.owner,'account-b');
    assert.match(oldError.message,/descartada/);
  } finally {api.localSignOut();}
});

test('discarding A failure must not clear the uncertainty of an actual B write', async () => {
  const api=await client();let owner='account-a', failOld, signal, writes=0;
  const dispatched=new Promise(resolve=>{signal=resolve;});
  globalThis.fetch=async(path)=>{
    if(path.includes('auth-'))return ok({token:jwt(),record:{id:owner,email:owner+'@example.invalid'}});
    writes++;
    if(owner==='account-a'){signal();return new Promise((resolve,reject)=>{failOld=reject;});}
    return new Response('B response could not be decoded');
  };
  await api.localSignIn('a','test');
  const old=api.localPatientApi.save({full_name:'Pending A'}).catch(error=>error);
  await dispatched;api.localSignOut();owner='account-b';await api.localSignIn('b','test');
  try {
    await assert.rejects(api.localPatientApi.save({full_name:'Uncertain B'}),/confirmar el guardado/);
    failOld(new TypeError('Late failure A'));assert.match((await old).message,/descartada/);
    await assert.rejects(api.localPatientApi.save({full_name:'Do not repeat B'}),/guardado sin confirmar/);
    assert.equal(writes,2);
  } finally {api.localSignOut();}
});

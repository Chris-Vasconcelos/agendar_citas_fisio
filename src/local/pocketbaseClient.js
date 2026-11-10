// Prototype only: not imported by the current Supabase-powered app.
// PocketBase auth is token-based; keeping the token in memory avoids persistent browser storage.
const path = '/api/collections/';
let token = '';

export function localSignOut() { token = ''; }
export function localIsAuthenticated() { return Boolean(token); }

async function api(endpoint, {method = 'GET', data} = {}) {
  const headers = {Accept:'application/json'};
  if (token) headers.Authorization = token;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint, {
    method, headers, cache:'no-store', credentials:'omit',
    ...(data === undefined ? {} : {body:JSON.stringify(data)})
  });
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) throw new Error('MINA Local: solicitud rechazada ('+response.status+').');
  return body;
}

export async function localSignIn(email,password) {
  token = '';
  const result = await api(path+'mina_operators/auth-with-password', {
    method:'POST', data:{identity:email,password}
  });
  if (!result?.token || !result?.record?.id) throw new Error('Respuesta de inicio de sesión inválida.');
  token = result.token;
  return {id:result.record.id,email:result.record.email};
}

async function list(collection,sort) {
  if (!token) throw new Error('Inicia sesión para consultar MINA Local.');
  const qs = new URLSearchParams({page:'1',perPage:'200',sort});
  const result = await api(path+collection+'/records?'+qs);
  if (result.totalPages > 1) throw new Error('Falta implementar paginación para más de 200 registros.');
  return result.items || [];
}
async function write(collection,record,id) {
  if (!token) throw new Error('Inicia sesión para guardar datos.');
  return api(path+collection+'/records'+(id?'/'+encodeURIComponent(id):''), {
    method:id?'PATCH':'POST',data:record
  });
}

export const localPatientApi = {
  list:()=>list('mina_patients','full_name'),
  save:(owner,record,id)=>write('mina_patients',{...record,owner},id)
};
export const localAppointmentApi = {
  list:()=>list('mina_appointments','start_time'),
  save:(owner,record,id)=>write('mina_appointments',{...record,owner},id),
  cancel:id=>write('mina_appointments',{status:'cancelled'},id)
};

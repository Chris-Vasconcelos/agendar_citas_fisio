// Experimental PocketBase adapter. No Supabase fallback or browser-persisted clinical data.
let auth = null;
let token = '';
const url = '/api/collections/';
export function localCurrentUser() { return auth; }
export function localSignOut() { token = ''; auth = null; }
async function http(path,{method='GET',payload}={}) {
  const headers={Accept:'application/json'};
  if(token) headers.Authorization=token;
  if(payload!==undefined) headers['Content-Type']='application/json';
  let response;
  try {
    response=await fetch(path,{method,headers,cache:'no-store',credentials:'omit',
      ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
  } catch { throw new Error('No hay conexión con el servidor local. No se guardó ningún dato.'); }
  const result=await response.json().catch(()=>null);
  if(!response.ok) {
    if(response.status===401) localSignOut();
    throw new Error(response.status===401||response.status===403
      ? 'Acceso denegado o sesión expirada.'
      : 'El servidor rechazó la operación ('+response.status+').');
  }
  return result;
}
export async function localSignIn(email,password){
  localSignOut();
  const data=await http(url+'mina_operators/auth-with-password',{method:'POST',payload:{identity:email,password}});
  if(!data?.token||!data?.record?.id)throw new Error('Respuesta de autenticación inválida.');
  token=data.token;auth={id:data.record.id,email:data.record.email};
  return auth;
}
async function list(name,sort='created'){
  if(!auth)throw new Error('Inicia sesión.');
  const records=[];
  for(let page=1;page<=100;page++){
    const params=new URLSearchParams({page:String(page),perPage:'200',sort});
    const data=await http(url+name+'/records?'+params);
    if(!Array.isArray(data?.items))throw new Error('Respuesta de datos inválida.');
    records.push(...data.items);
    if(page>=(data.totalPages||1))return records;
  }
  throw new Error('Demasiados registros para el prototipo.');
}
async function write(name,payload,id){
  if(!auth)throw new Error('Inicia sesión.');
  return http(url+name+'/records'+(id?'/'+encodeURIComponent(id):''),{
    method:id?'PATCH':'POST',payload});
}
const patientMap=p=>({...p,email:p.email_address||null,user_id:p.owner});
const appointmentMap=a=>({...a,patient_id:a.patient,user_id:a.owner,
  start_time:a.start_time.replace(' ','T'),end_time:a.end_time.replace(' ','T')});
export const localPatientApi={
  list:async()=> (await list('mina_patients','full_name')).map(patientMap),
  save:async(p,id)=>{
    const {email,user_id,...fields}=p;
    if(fields.owner&&fields.owner!==auth?.id)throw new Error('Operador distinto.');
    return patientMap(await write('mina_patients',{...fields,owner:auth.id,email_address:email||''},id));
  }
};
export const localAppointmentApi={
  list:async()=> (await list('mina_appointments','start_time')).map(appointmentMap),
  save:async(p,id)=>{
    const {patient_id,user_id,...fields}=p;
    if(fields.owner&&fields.owner!==auth?.id)throw new Error('Operador distinto.');
    return appointmentMap(await write('mina_appointments',{
      ...fields,owner:auth.id,patient:patient_id},id));
  },
  cancel:async id=>appointmentMap(await write('mina_appointments',{status:'cancelled'},id)),
};
export const localAvailabilityApi={
  list:async()=>list('mina_availability','day_of_week'),
  save:async(p)=>{
    const day=Number(p.day_of_week);
    const existing=(await list('mina_availability','day_of_week'))
      .find(x=>Number(x.day_of_week)===day);
    return write('mina_availability',{...p,owner:auth.id},existing?.id);
  }
};

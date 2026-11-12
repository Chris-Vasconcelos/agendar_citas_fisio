import React,{useState} from 'react';
import {localSignIn,localSignOut,localCurrentUser,localPatientApi,localAppointmentApi} from './pocketbaseClient';

// Deliberately separate from the real MINA interface until all local modules are migrated.
export function LocalPreview(){
 const [user,setUser]=useState(localCurrentUser());
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [patients,setPatients]=useState([]);
 const [appointments,setAppointments]=useState([]);
 const [fullName,setFullName]=useState('');
 const [phone,setPhone]=useState('');
 const [patientId,setPatientId]=useState('');
 const [day,setDay]=useState('2026-12-09');
 const [hour,setHour]=useState('09:00');
 const [slot,setSlot]=useState('1');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const onError=e=>setError(e?.message||'La operación falló; no se guardaron cambios.');
 async function refresh(){
   const [p,a]=await Promise.all([localPatientApi.list(),localAppointmentApi.list()]);
   setPatients(p);setAppointments(a);
 }
 async function perform(task){
   if(busy)return;
   setBusy(true);setError('');
   try{await task();}catch(e){onError(e);}finally{setBusy(false);}
 }
 const login=e=>{e.preventDefault();perform(async()=>{
   const next=await localSignIn(email,password);
   try{await refresh();setUser(next);setPassword('');}
   catch(err){localSignOut();throw err;}
 });};
 const createPatient=e=>{e.preventDefault();perform(async()=>{
   await localPatientApi.save({
    full_name:fullName.trim(),age:25,phone:phone.trim(),consultation_reason:'Datos ficticios para prueba de MINA Local',
    privacy_consent:true,privacy_consent_at:new Date().toISOString()
   });
   setFullName('');setPhone('');await refresh();
 });};
 const createAppointment=e=>{e.preventDefault();perform(async()=>{
   if(!patientId)throw new Error('Selecciona un paciente.');
   const start=new Date(day+'T'+hour+':00');
   if(Number.isNaN(start.getTime()))throw new Error('Fecha inválida.');
   const end=new Date(start.getTime()+60*60000);
   await localAppointmentApi.save({
      patient_id:patientId,slot_number:Number(slot),
      start_time:start.toISOString(),end_time:end.toISOString(),status:'scheduled',
      patient_condition:'',treatment_notes:'',professional_name:'Fisioterapeuta (prueba)'
   });
   await refresh();
 });};
 const logout=()=>{localSignOut();setUser(null);setPatients([]);setAppointments([]);setPassword('');setError('');};
 return <main style={{maxWidth:850,margin:'30px auto',fontFamily:'system-ui',padding:18}}>
  <h1>MINA Local · Laboratorio de integración</h1>
  <p><strong>Solo datos ficticios.</strong> Esta pantalla no es la versión clínica ni incorpora todavía respaldos, HTTPS o instalación de Windows.</p>
  {!user ? <form onSubmit={login}>
   <label>Correo <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>{' '}
   <label>Contraseña <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>{' '}
   <button disabled={busy}>Iniciar sesión</button>
  </form> : <>
   <p>Sesión de prueba: {user.email} <button onClick={logout}>Cerrar sesión</button> <button disabled={busy} onClick={()=>perform(refresh)}>Actualizar</button></p>
   <section><h2>Pacientes de prueba ({patients.length})</h2>
    <form onSubmit={createPatient}>
      <input placeholder="Nombre ficticio" required minLength={3} value={fullName} onChange={e=>setFullName(e.target.value)}/>{' '}
      <input placeholder="Teléfono ficticio" required minLength={7} value={phone} onChange={e=>setPhone(e.target.value)}/>{' '}
      <button disabled={busy}>Guardar paciente</button>
    </form>
    <ul>{patients.map(p=><li key={p.id}>{p.full_name} · {p.phone}</li>)}</ul>
   </section>
   <section><h2>Agenda de prueba ({appointments.length})</h2>
    <form onSubmit={createAppointment}>
     <select required value={patientId} onChange={e=>setPatientId(e.target.value)}>
      <option value="">Paciente</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
     </select>{' '}
     <input type="date" required value={day} onChange={e=>setDay(e.target.value)}/>{' '}
     <input type="time" required value={hour} onChange={e=>setHour(e.target.value)}/>{' '}
     <select value={slot} onChange={e=>setSlot(e.target.value)}><option value="1">Espacio 1</option><option value="2">Espacio 2</option></select>{' '}
     <button disabled={busy}>Agendar una hora</button>
    </form>
    <ul>{appointments.map(a=><li key={a.id}>
       {new Date(a.start_time).toLocaleString('es-MX')} · Espacio {a.slot_number} · {patients.find(p=>p.id===a.patient_id)?.full_name||'Paciente'} · {a.status}{' '}
       {a.status!=='cancelled'&&<button disabled={busy} onClick={()=>perform(async()=>{await localAppointmentApi.cancel(a.id);await refresh();})}>Cancelar</button>}
     </li>)}</ul>
   </section>
  </>}
  {error&&<p role="alert" style={{color:'#a00'}}>{error}</p>}
 </main>;
}

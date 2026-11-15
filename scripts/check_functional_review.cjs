const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {readFileSync} = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.MINA_TEST_CHROMIUM ? {executablePath:process.env.MINA_TEST_CHROMIUM}: {})});
  const context = await browser.newContext({timezoneId:'America/Mexico_City',acceptDownloads:true});
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const failures = [], errors = []; page.on('pageerror',(e)=>errors.push(e.message));
  const check = async(name,fn) => {try {await fn(); console.log('Review PASS: '+name);} catch(e) {failures.push(name+': '+e.message); console.error('Review FAIL: '+name+': '+e.message.slice(0,600));}};
  const root = 'http://127.0.0.1:8090';
  const authResponse = await context.request.post(root+'/api/collections/mina_operators/auth-with-password',{data:{identity:'mina-owner-2@example.invalid',password:'PrototypePassword_123456!'}});
  assert.ok(authResponse.ok()); const auth = await authResponse.json(), headers={Authorization:auth.token};
  const records=(name)=>root+'/api/collections/'+name+'/records';
  const create=async(name,data)=>{const r=await context.request.post(records(name),{headers,data});assert.ok(r.ok(),await r.text());return r.json();};
  const patch=async(name,record,data)=>{const r=await context.request.patch(records(name)+'/'+record.id,{headers,data:{...data,previous_version:record.write_version||'',write_version:randomUUID()}});assert.ok(r.ok(),await r.text());return r.json();};
  let alfa=await create('mina_patients',{owner:auth.record.id,full_name:'Revisión Alfa Ficticia',age:30,phone:'7225550151',consultation_reason:'Evaluación ficticia de revisión',privacy_consent:true});
  const beta=await create('mina_patients',{owner:auth.record.id,full_name:'Revisión Beta Ficticia',age:31,phone:'7225550161',consultation_reason:'Evaluación ficticia de revisión',privacy_consent:true});
  const day='2030-01-07';
  let first=await create('mina_appointments',{owner:auth.record.id,patient:alfa.id,slot_number:1,status:'scheduled',start_time:day+'T10:00:00-06:00',end_time:day+'T10:30:00-06:00'});
  await create('mina_appointments',{owner:auth.record.id,patient:beta.id,slot_number:1,status:'scheduled',start_time:day+'T10:30:00-06:00',end_time:day+'T11:00:00-06:00'});
  await create('mina_appointments',{owner:auth.record.id,patient:alfa.id,slot_number:2,status:'scheduled',start_time:day+'T23:00:00-06:00',end_time:day+'T23:30:00-06:00'});
  const cancelled=await create('mina_appointments',{owner:auth.record.id,patient:beta.id,slot_number:1,status:'cancelled',start_time:day+'T10:00:00-06:00',end_time:day+'T10:30:00-06:00'});
  let hours=await create('mina_availability',{owner:auth.record.id,day_of_week:1,start_time:'08:00',end_time:'09:00',slot_duration_minutes:60,is_active:false});
  try {
    await check('HTTP stale edit is rejected even without browser validation',async()=>{
      const old=first;
      first=await patch('mina_appointments',first,{treatment_notes:'Primera nota guardada por otro operador del equipo'});
      const stale=await context.request.patch(records('mina_appointments')+'/'+first.id,{headers,data:{treatment_notes:'Edicion obsoleta',previous_version:old.write_version||'',write_version:randomUUID()}});
      assert.notEqual(stale.status(),200);
    });
    await page.goto(root);
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();
    await page.locator('#auth-email-input').fill('mina-owner-2@example.invalid');
    await page.locator('#auth-password-input').fill('PrototypePassword_123456!');
    await page.getByRole('button',{name:'Entrar al Consultorio'}).click();
    await page.locator('#agenda-date-picker').fill(day);
    await page.getByRole('button',{name:'Semana',exact:true}).click();
    await check('weekly view displays both consecutive appointments and 23:00 outside working hours', async()=>{
      await page.getByRole('button',{name:'Abrir cita de Revisión Beta Ficticia, espacio 1, de 10:30 a 11:00',exact:true}).waitFor();
      await page.getByRole('button',{name:'Abrir cita de Revisión Alfa Ficticia, espacio 2, de 23:00 a 23:30',exact:true}).waitFor();
      const early=await page.getByRole('button',{name:'Abrir cita de Revisión Alfa Ficticia, espacio 1, de 10:00 a 10:30',exact:true}).boundingBox();
      const later=await page.getByRole('button',{name:'Abrir cita de Revisión Beta Ficticia, espacio 1, de 10:30 a 11:00',exact:true}).boundingBox();
      assert.ok(early && later && later.y >= early.y+early.height-1,'Consecutive appointment cards overlap');
    });
    await page.getByRole('button',{name:'Día',exact:true}).click();
    await check('closed day keeps its three appointments and creates no empty appointment buttons',async()=>{
      assert.equal(await page.locator('.calendar-booked-slot').count(),3);
      assert.equal(await page.getByRole('button',{name:'+ Agendar',exact:true}).count(),0);
      await page.locator('.calendar-booked-slot').filter({hasText:'Revisión Beta Ficticia'}).getByText('10:30 – 11:00',{exact:true}).waitFor();
    });
    const patients = async()=>{await page.getByRole('button',{name:'Expedientes',exact:true}).click();await page.locator('#patient-search-input').fill('Revisión Alfa');await page.locator('.mina-patient-row').waitFor();};
    await patients();
    await page.route('**/api/collections/mina_patient_documents/records?**',route=>route.fulfill({status:503,body:'{}'}));
    await page.getByRole('button',{name:/Historial/}).click();
    await check('photograph load failure never claims there are no photographs',async()=>{
      await page.getByRole('alert').filter({hasText:'No se pudieron consultar los consentimientos'}).waitFor();
      assert.equal(await page.getByText('Sin fotografías registradas.',{exact:true}).count(),0);
    });
    await page.unroute('**/api/collections/mina_patient_documents/records?**');
    await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.getByRole('button',{name:/Historial/}).click();
    await check('closing a record asks before discarding a selected photo',async()=>{
      await page.locator('#signed-consent-photo').setInputFiles({name:'pendiente-ficticia.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=','base64')});
      page.once('dialog',dialog=>dialog.dismiss());
      await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
      assert.equal(await page.getByRole('dialog').count(),1);
      await page.getByText(/Imagen seleccionada: pendiente-ficticia/).waitFor();
      page.once('dialog',dialog=>dialog.accept());
      await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
    });
    // Ensure later checks can run against the original version as well.
    if (await page.getByRole('dialog').count()) {page.once('dialog',d=>d.accept());await page.getByRole('dialog').getByRole('button',{name:'Cerrar',exact:true}).click();}
    await page.getByRole('button',{name:'Agenda',exact:true}).click();
    alfa=await patch('mina_patients',alfa,{phone:'7225550152'});
    await check('returning to Patients reads changes from another device',async()=>{
      await patients();
      await page.waitForFunction(()=>document.querySelector('.mina-patient-row')?.innerText.replace(/\D/g,'').includes('7225550152'));
    });
    await check('explicit refresh reads an updated weekly schedule',async()=>{
      hours=await patch('mina_availability',hours,{end_time:'15:00',is_active:true});
      await page.getByRole('button',{name:'Horarios',exact:true}).click();
      await page.getByLabel('Cierre de Lunes',{exact:true}).waitFor();
      assert.equal(await page.getByLabel('Cierre de Lunes',{exact:true}).inputValue(),'15:00');
      hours=await patch('mina_availability',hours,{end_time:'16:00'});
      await page.getByRole('button',{name:'Actualizar datos',exact:true}).click();
      await page.getByLabel('Cierre de Lunes',{exact:true}).waitFor();
      assert.equal(await page.getByLabel('Cierre de Lunes',{exact:true}).inputValue(),'16:00');
    });
    await check('JSON export reads the server at export time and retains clinical notes',async()=>{
      await page.getByRole('button',{name:'Respaldos',exact:true}).click();
      alfa=await patch('mina_patients',alfa,{phone:'7225550153'});
      const pending=page.waitForEvent('download');
      await page.getByRole('button',{name:'Exportar datos (.JSON, sin fotografías)',exact:true}).click();
      const download=await pending;
      const exported=JSON.parse(readFileSync(await download.path(),'utf8'));
      assert.equal(exported.patients.find(p=>p.id===alfa.id).phone,'7225550153');
      assert.equal(exported.appointments.filter(a=>a.id===first.id).length,1);
    });
    await check('CSV export also reads the current patient data',async()=>{
      alfa=await patch('mina_patients',alfa,{phone:'7225550154'});
      const pending=page.waitForEvent('download');
      await page.getByRole('button',{name:'Exportar a Excel (.CSV)',exact:true}).click();
      const download=await pending;
      assert.ok(readFileSync(await download.path(),'utf8').includes('7225550154'));
    });
    await check('failed export shows an error and does not offer a stale download',async()=>{
      let downloaded=false; const mark=()=>{downloaded=true;};page.on('download',mark);
      await page.route('**/api/collections/mina_patients/records?**',r=>r.fulfill({status:503,body:'{}'}));
      await page.getByRole('button',{name:'Exportar datos (.JSON, sin fotografías)',exact:true}).click();
      await page.getByRole('alert').filter({hasText:'No se pudo preparar la exportación'}).waitFor();
      assert.equal(downloaded,false);page.off('download',mark);
      await page.unroute('**/api/collections/mina_patients/records?**');
    });
    await check('a stale clinical note is rejected and its unsaved text is preserved',async()=>{
      await page.getByRole('button',{name:'Agenda',exact:true}).click();
      await page.getByRole('button',{name:'Día',exact:true}).click();
      const card=page.locator('.calendar-booked-slot').filter({hasText:'Revisión Alfa Ficticia'}).filter({hasText:'10:00 – 10:30'});
      await card.getByRole('button',{name:'Atender / nota',exact:true}).click();
      await page.locator('#apt-treatment-notes').fill('Borrador local que debe conservarse');
      first=await patch('mina_appointments',first,{treatment_notes:'Nota guardada en el otro dispositivo'});
      await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
      await page.getByText(/El registro cambió en otra ventana o dispositivo/).waitFor();
      assert.equal(await page.locator('#apt-treatment-notes').inputValue(),'Borrador local que debe conservarse');
      const latest=await context.request.get(records('mina_appointments')+'/'+first.id,{headers});
      assert.equal((await latest.json()).treatment_notes,'Nota guardada en el otro dispositivo');
      await page.getByRole('dialog').getByRole('button',{name:'×',exact:true}).click();
    });
    await check('a cancelled appointment keeps its status when its note is edited in an occupied slot',async()=>{
      await page.getByRole('button',{name:'Expedientes',exact:true}).click();
      await page.locator('#patient-search-input').fill('Revisión Beta');
      await page.getByRole('button',{name:/Historial/}).click();
      await page.locator('[data-appointment-id="'+cancelled.id+'"]').getByRole('button',{name:'Editar nota',exact:true}).click();
      assert.equal(await page.locator('#apt-status-select').inputValue(),'cancelled');
      await page.locator('#apt-treatment-notes').fill('Nota conservada de cita cancelada');
      await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
      await page.getByRole('dialog').waitFor({state:'hidden'});
      const r=await context.request.get(records('mina_appointments')+'/'+cancelled.id,{headers});const stored=await r.json();
      assert.equal(stored.status,'cancelled');assert.equal(stored.treatment_notes,'Nota conservada de cita cancelada');
    });
    await check('the duplicate warning requires confirming a different person before saving',async()=>{
      await page.getByRole('button',{name:'Nuevo paciente',exact:true}).click();
      await page.locator('#patient-full-name').fill('Revisión Alfa Ficticia');
      await page.locator('#patient-age').fill('30');
      await page.locator('#patient-phone').fill('7225550154');
      await page.getByText('Datos clínicos (motivo de consulta requerido)',{exact:true}).click();
      await page.locator('#patient-reason').fill('Evaluación ficticia duplicada');
      await page.locator('#patient-privacy-consent').check();
      await page.getByText('Posible expediente duplicado',{exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Guardar paciente',exact:true}).isDisabled(),true);
      await page.getByRole('checkbox',{name:'Verifiqué que se trata de una persona distinta.',exact:true}).check();
      assert.equal(await page.getByRole('button',{name:'Guardar paciente',exact:true}).isEnabled(),true);
      await page.getByRole('button',{name:'Cerrar formulario',exact:true}).click();
    });
    await check('failed global refresh blocks clinical views and retry recovers without a false empty state',async()=>{
      await page.route('**/api/collections/mina_availability/records?**',r=>r.fulfill({status:503,body:'{}'}));
      await page.getByRole('button',{name:'Actualizar datos',exact:true}).click();
      await page.getByText('No se pudieron cargar los datos de MINA.',{exact:true}).waitFor();
      assert.equal(await page.locator('.mina-patient-row').count(),0);
      assert.equal(await page.getByRole('button',{name:'Nueva cita',exact:true}).isDisabled(),true);
      await page.unroute('**/api/collections/mina_availability/records?**');
      await page.getByRole('button',{name:'Reintentar carga',exact:true}).click();
      await page.locator('.mina-patient-row').first().waitFor();
    });
    await check('a failed session restore can be retried after the server returns',async()=>{
      const metadata=await page.evaluate(()=>sessionStorage.getItem('mina_local_session_token'));
      assert.ok(metadata);
      const recovery=await browser.newContext({timezoneId:'America/Mexico_City'});
      try {
        await recovery.addInitScript(value=>sessionStorage.setItem('mina_local_session_token',value),metadata);
        const target=await recovery.newPage();
        await target.route('**/api/collections/mina_operators/auth-refresh',r=>r.abort());
        await target.goto(root);
        await target.getByText('No se pudieron cargar los datos de MINA.',{exact:true}).waitFor();
        await target.unroute('**/api/collections/mina_operators/auth-refresh');
        await target.getByRole('button',{name:'Reintentar carga',exact:true}).click();
        await target.getByRole('button',{name:'Expedientes',exact:true}).click();
        await target.locator('.mina-patient-row').first().waitFor();
      } finally {await recovery.close();}
    });
    await check('blocked browser storage does not prevent an in-memory login',async()=>{
      const restricted=await browser.newContext({timezoneId:'America/Mexico_City'});
      try {
        await restricted.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem']) Storage.prototype[method]=()=>{throw new DOMException('Storage blocked','SecurityError');};});
        const target=await restricted.newPage();await target.goto(root);
        await target.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();
        await target.locator('#auth-email-input').fill('mina-owner-2@example.invalid');
        await target.locator('#auth-password-input').fill('PrototypePassword_123456!');
        await target.getByRole('button',{name:'Entrar al Consultorio'}).click();
        await target.getByRole('button',{name:'Expedientes',exact:true}).click();
        await target.locator('.mina-patient-row').first().waitFor();
        assert.equal(await target.getByText('No se pudieron cargar los datos de MINA.',{exact:true}).count(),0);
      } finally {await restricted.close();}
    });
    assert.deepEqual(errors,[]);
    if(failures.length)throw new Error(failures.join('\n'));
    console.log('Functional review PASS: calendar visibility, consecutive/late appointments, photo errors/drafts, fresh navigation/refresh, server-backed exports and stale-note protection.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

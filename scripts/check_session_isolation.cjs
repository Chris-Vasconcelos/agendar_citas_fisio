// Security-report regressions: one document, real server writes, controlled late responses.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
(async () => {
  const root='http://127.0.0.1:8090';
  const browser=await chromium.launch({headless:true,...(process.env.MINA_TEST_CHROMIUM?{executablePath:process.env.MINA_TEST_CHROMIUM}:{})});
  const context=await browser.newContext({timezoneId:'America/Mexico_City',acceptDownloads:true});
  const page=await context.newPage();
  const errors=[], downloads=[], external=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('download',download=>downloads.push(download.suggestedFilename()));
  context.on('request',request=>{if(new URL(request.url()).origin!==root)external.push(request.url());});
  const auth=[];
  for(const index of [1,2]) {
    const response=await context.request.post(root+'/api/collections/mina_operators/auth-with-password',{data:{identity:`mina-owner-${index}@example.invalid`,password:'PrototypePassword_123456!'}});
    assert.ok(response.ok());auth.push(await response.json());
  }
  const records=name=>root+'/api/collections/'+name+'/records';
  const create=async(index,name,data)=>{
    const r=await context.request.post(records(name),{headers:{Authorization:auth[index].token},data:{owner:auth[index].record.id,...data}});
    assert.ok(r.ok(),await r.text());return r.json();
  };
  const secretName='Aislamiento Paciente Alfa Ficticio', secretNote='Nota privada de Alfa en respuesta retenida';
  const patients=[];
  for(const [index,name] of [[0,secretName],[1,'Aislamiento Paciente Beta Ficticio']]) patients.push(await create(index,'mina_patients',{
    full_name:name,age:34,phone:index?'7225550472':'7225550471',consultation_reason:'Prueba ficticia de aislamiento',privacy_consent:true,
  }));
  const day='2035-01-08';
  const appointments=[];
  for(const index of [0,1]) appointments.push(await create(index,'mina_appointments',{
    patient:patients[index].id,slot_number:1,start_time:day+'T10:00:00-06:00',end_time:day+'T11:00:00-06:00',status:'scheduled',treatment_notes:index?'Nota autorizada de Beta':'Nota inicial de Alfa',
  }));
  await create(1,'mina_appointments',{patient:patients[1].id,slot_number:1,start_time:'2035-01-09T10:00:00-06:00',end_time:'2035-01-09T11:00:00-06:00',status:'scheduled',treatment_notes:'Otro control autorizado de Beta'});
  const signIn=async index=>{
    const logout=page.getByRole('button',{name:'Cerrar sesión',exact:true});
    // Emulate an auth change while a saving modal is open, as in expiry/storage events.
    if(await logout.count()) await logout.evaluate(button=>button.click());
    await page.getByRole('button',{name:'Iniciar sesión',exact:true}).last().click();
    await page.locator('#auth-email-input').fill(`mina-owner-${index}@example.invalid`);
    await page.locator('#auth-password-input').fill('PrototypePassword_123456!');
    await page.getByRole('button',{name:'Entrar al Consultorio'}).click();
    await page.getByRole('button',{name:'Expedientes',exact:true}).click();
    await page.locator('#patient-search-input').waitFor();
  };
  const hold=async(pattern,method,abort=false)=>{
    let capture,release,finish,used=false;
    const captured=new Promise(resolve=>{capture=resolve;});
    const gate=new Promise(resolve=>{release=resolve;});
    const finished=new Promise(resolve=>{finish=resolve;});
    const handler=async route=>{
      if(used || route.request().method()!==method)return route.continue();
      used=true;const response=await route.fetch();
      assert.ok(response.ok(),await response.text());capture();await gate;
      if(abort)await route.abort('failed');else await route.fulfill({response});
      finish();
    };
    await page.route(pattern,handler);
    return {captured,async release(){release();await finished;await page.waitForLoadState('networkidle');await page.unroute(pattern,handler);}};
  };
  const bForm=async()=>{
    await page.getByRole('button',{name:'Nuevo paciente',exact:true}).click();
    await page.locator('#patient-full-name').fill('Formulario vigente de Beta');
  };
  const assertBForm=async()=>{
    assert.equal(await page.locator('#patient-full-name').inputValue(),'Formulario vigente de Beta');
    assert.doesNotMatch(await page.getByRole('dialog').innerText(),/Alfa|descartada|sesión cambió/);
    await page.getByRole('button',{name:'Cerrar formulario',exact:true}).click();
    assert.doesNotMatch(await page.locator('main').innerText(),/Aislamiento Paciente Alfa|Nota privada de Alfa/);
  };
  const exportB=async(format='JSON')=>{
    await page.getByRole('button',{name:'Respaldos',exact:true}).click();
    const pending=page.waitForEvent('download');
    await page.getByRole('button',{name:format==='JSON'?'Exportar datos (.JSON, sin fotografías)':'Exportar a Excel (.CSV)',exact:true}).click();
    const file=await pending;const text=readFileSync(await file.path(),'utf8');
    assert.ok(!text.includes(secretName) && !text.includes(secretNote));
    assert.ok(text.includes('Aislamiento Paciente Beta Ficticio') && text.includes('Nota autorizada de Beta'));
    if(format==='JSON'){
      const data=JSON.parse(text);
      assert.ok(data.patients.every(patient=>patient.user_id===auth[1].record.id));
      assert.ok(data.appointments.every(appointment=>appointment.user_id===auth[1].record.id));
    }
  };
  try {
    await page.goto(root);await signIn(1);
    await page.locator('#patient-search-input').fill(secretName);
    await page.getByRole('button',{name:/Historial/}).click();
    await page.locator('[data-appointment-id="'+appointments[0].id+'"]').getByRole('button',{name:'Editar nota',exact:true}).click();
    await page.locator('#apt-treatment-notes').fill(secretNote);
    const lateNote=await hold('**/api/collections/mina_appointments/records/'+appointments[0].id,'PATCH');
    await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();await lateNote.captured;
    await signIn(2);await bForm();await lateNote.release();await assertBForm();
    await exportB();
    const savedNote=await context.request.get(records('mina_appointments')+'/'+appointments[0].id,{headers:{Authorization:auth[0].token}});
    assert.ok(savedNote.ok());assert.equal((await savedNote.json()).treatment_notes,secretNote);
    console.log('Session PASS: a real late appointment response cannot change B forms, views or JSON; A note remains saved on server.');

    await signIn(1);await page.getByRole('button',{name:'Nueva cita',exact:true}).click();
    await page.locator('#apt-patient-select').selectOption(patients[0].id);
    await page.locator('#apt-date-input').fill('2035-01-09');await page.locator('#apt-start-time').fill('12:00');
    await page.locator('#slot-option-1').check();
    const lateCreate=await hold('**/api/collections/mina_appointments/records','POST');
    await page.getByRole('button',{name:'Agendar cita',exact:true}).click();await lateCreate.captured;
    await signIn(2);await page.getByRole('button',{name:'Agenda',exact:true}).click();
    await page.locator('#agenda-date-picker').fill('2035-01-09');await page.getByRole('button',{name:'Día',exact:true}).click();
    assert.equal(await page.locator('.calendar-booked-slot').count(),1);
    await page.getByRole('button',{name:'Nueva cita',exact:true}).click();
    await page.locator('#apt-patient-select').selectOption(patients[1].id);await page.locator('#apt-start-time').fill('15:00');
    await lateCreate.release();
    assert.equal(await page.locator('#apt-patient-select').inputValue(),patients[1].id);
    assert.equal(await page.locator('#apt-start-time').inputValue(),'15:00');
    await page.getByRole('dialog').getByRole('button',{name:'×',exact:true}).click();
    // Do not navigate or refresh before inspecting the calendar's in-memory collection.
    assert.equal(await page.locator('.calendar-booked-slot').count(),1);
    assert.match(await page.locator('.calendar-booked-slot').innerText(),/Aislamiento Paciente Beta/);
    await exportB();
    console.log('Session PASS: late appointment creation cannot append A appointments to B or close B forms.');

    await signIn(1);await page.getByRole('button',{name:'Agenda',exact:true}).click();
    await page.locator('#agenda-date-picker').fill(day);await page.getByRole('button',{name:'Día',exact:true}).click();
    const lateCancel=await hold('**/api/collections/mina_appointments/records/'+appointments[0].id,'PATCH');
    await page.locator('.calendar-booked-slot').filter({hasText:secretName}).getByRole('button',{name:'Cancelar',exact:true}).click();await lateCancel.captured;
    await signIn(2);await bForm();await lateCancel.release();await assertBForm();
    await page.getByRole('button',{name:'Respaldos',exact:true}).click();
    assert.equal(await page.getByRole('heading',{name:'Actividad reciente:',exact:true}).count(),0);
    assert.doesNotMatch(await page.locator('main').innerText(),/marcada como Cancelada/);
    await exportB();
    const cancelled=await context.request.get(records('mina_appointments')+'/'+appointments[0].id,{headers:{Authorization:auth[0].token}});
    assert.ok(cancelled.ok());assert.equal((await cancelled.json()).status,'cancelled');
    console.log('Session PASS: late cancellation cannot modify B state; the legitimate A cancellation remains stored.');

    for(const format of ['JSON','CSV']){
      await signIn(1);await page.getByRole('button',{name:'Respaldos',exact:true}).click();
      await page.getByRole('button',{name:'Exportar datos (.JSON, sin fotografías)',exact:true}).waitFor();
      const before=downloads.length;
      const lateExport=await hold('**/api/collections/mina_appointments/records?**','GET');
      await page.getByRole('button',{name:format==='JSON'?'Exportar datos (.JSON, sin fotografías)':'Exportar a Excel (.CSV)',exact:true}).click();await lateExport.captured;
      await signIn(2);await bForm();await lateExport.release();await assertBForm();
      assert.equal(downloads.length,before,'An old export downloaded A data after B signed in');
      await exportB(format);
      console.log('Session PASS: late '+format+' export from A creates no download after B signs in; B export remains authorized and complete.');
    }

    await signIn(1);await page.getByRole('button',{name:'Nuevo paciente',exact:true}).click();
    await page.locator('#patient-full-name').fill('Aislamiento Registro Tardio Alfa');
    await page.locator('#patient-age').fill('26');await page.locator('#patient-phone').fill('7225550481');
    await page.getByText('Datos clínicos (motivo de consulta requerido)',{exact:true}).click();
    await page.locator('#patient-reason').fill('Prueba ficticia de fallo tardío');await page.locator('#patient-privacy-consent').check();
    const lateFailure=await hold('**/api/collections/mina_patients/records','POST',true);
    await page.getByRole('button',{name:'Guardar paciente',exact:true}).click();await lateFailure.captured;
    await signIn(2);await bForm();await lateFailure.release();await assertBForm();
    await page.getByRole('button',{name:'Nuevo paciente',exact:true}).click();
    await page.locator('#patient-full-name').fill('Aislamiento Guardado Valido Beta');
    await page.locator('#patient-age').fill('27');await page.locator('#patient-phone').fill('7225550482');
    await page.getByText('Datos clínicos (motivo de consulta requerido)',{exact:true}).click();
    await page.locator('#patient-reason').fill('Control legítimo tras error de otra cuenta');await page.locator('#patient-privacy-consent').check();
    await page.getByRole('button',{name:'Guardar paciente',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.locator('#patient-search-input').fill('Aislamiento Guardado Valido Beta');await page.locator('.mina-patient-row').waitFor();
    console.log('Session PASS: an old A transport failure does not block a legitimate B save.');

    await signIn(1);await page.locator('#patient-search-input').fill(secretName);
    const lateArchive=await hold('**/api/collections/mina_patients/records/'+patients[0].id,'PATCH');
    await page.getByLabel('Más acciones para '+secretName,{exact:true}).click();page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Archivar',exact:true}).click();await lateArchive.captured;
    await signIn(2);await lateArchive.release();await page.getByRole('button',{name:'Respaldos',exact:true}).click();
    assert.equal(await page.getByRole('heading',{name:'Actividad reciente:',exact:true}).count(),0);
    assert.doesNotMatch(await page.locator('main').innerText(),/Alfa|Expediente archivado/);
    await exportB();
    console.log('Session PASS: late archive adds no A activity to B and exports cannot include A records.');
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('Session isolation PASS: late notes, JSON/CSV downloads, transport errors, archive activity and legitimate controls, without reloading the shared tab.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.MINA_TEST_CHROMIUM ? { executablePath: process.env.MINA_TEST_CHROMIUM } : {}) });
  const context = await browser.newContext({ timezoneId: 'America/Mexico_City' });
  const page = await context.newPage();
  const errors = [];
  const externalRequests = [];
  context.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:8090') externalRequests.push(request.url());
  });
  const login = async (target) => {
    await target.goto('http://127.0.0.1:8090');
    await target.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
    await target.locator('#auth-email-input').fill('mina-owner-1@example.invalid');
    await target.locator('#auth-password-input').fill('PrototypePassword_123456!');
    await target.getByRole('button', { name: 'Entrar al Consultorio' }).click();
    await target.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await target.locator('.mina-patient-row').first().waitFor();
  };
  const openAppointment = async (target, patient, day) => {
    await target.getByRole('button', { name: 'Nueva cita', exact: true }).click();
    await target.locator('#apt-patient-select').selectOption({ label: patient });
    await target.locator('#apt-date-input').fill(day);
    await target.locator('#apt-start-time').fill('10:00');
    await target.locator('#slot-option-1').check();
  };
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:8090');
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
    await page.locator('#auth-email-input').fill('mina-owner-1@example.invalid');
    await page.locator('#auth-password-input').fill('PrototypePassword_123456!');
    await page.getByRole('button', { name: 'Entrar al Consultorio' }).click();
    await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click();
    await page.locator('#patient-full-name').fill('Paciente Navegador Ficticio');
    await page.locator('#patient-age').fill('27');
    await page.locator('#patient-phone').fill('7225550199');
    await page.getByText('Datos clínicos (motivo de consulta requerido)', { exact: true }).click();
    await page.locator('#patient-reason').fill('Prueba de integración, datos ficticios');
    await page.locator('#patient-privacy-consent').check();
    await page.getByRole('button', { name: 'Guardar paciente', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.locator('#patient-search-input').fill('Navegador');
    await page.locator('.mina-patient-row').waitFor();
    assert.equal(await page.locator('.mina-patient-row').count(), 1);
    await page.getByRole('button', { name: /Historial/ }).click();
    await page.locator('#signed-consent-photo').setInputFiles({name:'ficticio.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=','base64')});
    await page.getByRole('checkbox', { name: /Confirmo que la fotografía/ }).check();
    await page.getByRole('button', { name: 'Guardar fotografía privada' }).click();
    await page.getByRole('button', { name: 'Ver fotografía' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    // Sunday is numeric zero, and its schedule must survive a real server round trip.
    await page.getByRole('button', { name: 'Horarios', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Domingo', exact: true }).isChecked(), true);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/mina_availability/records') && r.request().method() === 'PATCH' && r.ok()),
      page.getByLabel('Apertura de Domingo', { exact: true }).fill('09:00'),
    ]);
    await page.reload();
    await page.getByRole('button', { name: 'Horarios', exact: true }).click();
    assert.equal(await page.getByRole('checkbox', { name: 'Domingo', exact: true }).isChecked(), true);
    assert.equal(await page.getByLabel('Apertura de Domingo', { exact: true }).inputValue(), '09:00');

    const day = await page.evaluate(() => {
      const date = new Date(); date.setDate(date.getDate() + 1);
      return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    });
    // Two independent browser sessions both load the free slot before either saves.
    const otherContext = await browser.newContext({ timezoneId: 'America/Mexico_City' });
    const other = await otherContext.newPage();
    other.on('pageerror', (e) => errors.push(e.message));
    await login(other);
    await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await page.locator('#patient-search-input').fill('Navegador');
    await page.getByRole('button', { name: /Historial/ }).waitFor();
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
    const patientOptions = await page.locator('#apt-patient-select option').allTextContents();
    const ownPatient = patientOptions.find((label) => label.includes('Navegador'));
    const otherPatient = patientOptions.find((label) => label.includes('Numero 2'));
    await page.getByRole('dialog').getByRole('button', { name: '×', exact: true }).click();
    assert.ok(ownPatient && otherPatient);
    await openAppointment(page, ownPatient, day);
    await openAppointment(other, otherPatient, day);
    await page.getByRole('button', { name: 'Agendar cita', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await other.getByRole('button', { name: 'Agendar cita', exact: true }).click();
    await other.getByText(/El servidor rechazó la operación/).waitFor();
    assert.equal(await other.getByRole('dialog').count(), 1);
    await otherContext.close();

    await page.getByRole('button', { name: 'Recordatorios', exact: true }).click();
    const reminder = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Paciente Navegador Ficticio', exact: true }) });
    await reminder.getByRole('checkbox').check();
    // Capture the user gesture without contacting WhatsApp or sending a message.
    await page.evaluate(() => { window.open = (url) => { window.testWhatsAppUrl = url; return {}; }; });
    await reminder.getByRole('button', { name: 'Abrir WhatsApp', exact: true }).click();
    await reminder.getByText('WhatsApp abierto; envío sin confirmar', { exact: true }).waitFor();
    assert.match(await page.evaluate(() => window.testWhatsAppUrl), /^https:\/\/wa\.me\/527225550199\?text=/);
    await reminder.getByRole('button', { name: 'Ya lo envié', exact: true }).click();
    await reminder.getByText('Envío confirmado manualmente', { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Recordatorios', exact: true }).click();
    await reminder.getByText('Envío confirmado manualmente', { exact: true }).waitFor();

    await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await page.locator('#patient-search-input').fill('Navegador');
    await page.getByRole('button', { name: /Historial/ }).click();
    await page.getByRole('button', { name: 'Editar nota', exact: true }).click();
    await page.locator('#apt-treatment-notes').fill('Tratamiento ficticio verificado por navegador.');
    await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload();
    await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await page.locator('#patient-search-input').fill('Navegador');
    await page.getByRole('button', { name: /Historial/ }).click();
    await page.getByRole('dialog').locator('p').filter({ hasText: 'Tratamiento ficticio verificado por navegador.' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();

    await page.getByLabel('Más acciones para Paciente Navegador Ficticio', { exact: true }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Archivar', exact: true }).click();
    await page.locator('.mina-patient-row').waitFor({ state: 'hidden' });
    await page.getByRole('checkbox', { name: 'Incluir expedientes archivados' }).check();
    await page.getByText('[Archivado] Paciente Navegador Ficticio · 27 años', { exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await page.locator('#patient-search-input').fill('Navegador');
    await page.getByRole('checkbox', { name: 'Incluir expedientes archivados' }).check();
    await page.getByRole('button', { name: /Historial/ }).waitFor();
    assert.equal(await page.locator('.mina-patient-row').count(), 1);
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    assert.ok(!storage.local.some((k) => /patients|appointments|availability/.test(k)), JSON.stringify(storage));
    assert.deepEqual(storage.session, ['mina_local_session_token']);
    await page.getByRole('button', { name: 'Respaldos', exact: true }).click();
    assert.equal(await page.locator('#restore-json-input').count(), 0);
    // A missing server is a visible blocking error, never an empty agenda.
    await page.route('**/api/**', (route) => route.abort());
    await page.reload();
    await page.getByText('No se pudieron cargar los datos de MINA.', { exact: true }).waitFor();
    assert.equal(await page.locator('.mina-patient-row').count(), 0);
    await page.unroute('**/api/**');
    await page.reload();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem('mina_local_session_token')), null);
    const signInAs = async (index) => {
      await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
      await page.locator('#auth-email-input').fill(`mina-owner-${index}@example.invalid`);
      await page.locator('#auth-password-input').fill('PrototypePassword_123456!');
      await page.getByRole('button', { name: 'Entrar al Consultorio' }).click();
      await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
      await page.locator('#patient-search-input').waitFor();
    };
    // A rejected password must preserve the form and show the login error.
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).last().click();
    await page.locator('#auth-email-input').fill('mina-owner-1@example.invalid');
    await page.locator('#auth-password-input').fill('WrongPassword_123456!');
    await page.getByRole('button', { name: 'Entrar al Consultorio' }).click();
    await page.getByRole('dialog').getByText(/El servidor rechazó la operación/).waitFor();
    assert.equal(await page.locator('#auth-email-input').inputValue(), 'mina-owner-1@example.invalid');
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    // Reproduce the review's leak without reloading the tab between accounts.
    await signInAs(1);
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).click();
    const conflictPatient = (await page.locator('#apt-patient-select option').allTextContents()).find((text) => text.includes('Numero 1'));
    await page.locator('#apt-patient-select').selectOption({ label: conflictPatient });
    await page.locator('#apt-date-input').fill('2026-12-09');
    await page.locator('#apt-start-time').fill('09:00');
    await page.locator('#slot-option-1').check();
    await page.getByRole('button', { name: 'Agendar cita', exact: true }).click();
    await page.getByRole('dialog').getByText(/El Espacio 1 ya está ocupado/).first().waitFor();
    await page.getByRole('dialog').getByRole('button', { name: '×', exact: true }).click();
    await page.getByRole('button', { name: 'Respaldos', exact: true }).click();
    await page.getByRole('heading', { name: 'Actividad reciente:', exact: true }).waitFor();
    assert.match(await page.locator('main').innerText(), /Paciente Ficticio Numero 3/);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await signInAs(2);
    await page.getByRole('button', { name: 'Respaldos', exact: true }).click();
    assert.doesNotMatch(await page.locator('main').innerText(), /Actividad reciente:|Paciente Ficticio Numero 3/);
    // A late response from A must not inject data/errors or close B's new form.
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await signInAs(1);
    await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click();
    await page.locator('#patient-full-name').fill('Paciente Respuesta Tardia Ficticio');
    await page.locator('#patient-age').fill('22');
    await page.locator('#patient-phone').fill('7225550138');
    await page.getByText('Datos clínicos (motivo de consulta requerido)', { exact: true }).click();
    await page.locator('#patient-reason').fill('Prueba aislada de cambio de cuenta');
    await page.locator('#patient-privacy-consent').check();
    let release;
    let received;
    const held = new Promise((resolve) => { release = resolve; });
    const dispatched = new Promise((resolve) => { received = resolve; });
    await page.route('**/api/collections/mina_patients/records', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch();
      received();
      await held;
      await route.fulfill({ response });
    });
    await page.getByRole('button', { name: 'Guardar paciente', exact: true }).click();
    await dispatched;
    // Simulate logout/expiry while a modal is saving, without reloading the tab.
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).evaluate((button) => button.click());
    await signInAs(2);
    await page.getByRole('button', { name: 'Nuevo paciente', exact: true }).click();
    await page.locator('#patient-full-name').fill('Formulario de la cuenta B');
    const lateResponse = page.waitForResponse((response) => response.url().endsWith('/mina_patients/records') && response.request().method() === 'POST');
    release();
    await lateResponse;
    // Flush the browser promise continuation after its response body is consumed.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
    assert.equal(await page.locator('#patient-full-name').inputValue(), 'Formulario de la cuenta B');
    assert.doesNotMatch(await page.getByRole('dialog').innerText(), /descartada|sesión cambió|Respuesta Tardia/);
    await page.getByRole('button', { name: 'Cerrar formulario', exact: true }).click();
    assert.doesNotMatch(await page.locator('main').innerText(), /Respuesta Tardia/);
    await page.unroute('**/api/collections/mina_patients/records');
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    // Returning to A is a fresh login lifetime, not a return to its old activity.
    await signInAs(1);
    await page.getByRole('button', { name: 'Respaldos', exact: true }).click();
    assert.equal(await page.getByRole('heading', { name: 'Actividad reciente:', exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, [], 'The local app must not fetch cloud services or remote fonts.');
    console.log('Browser PASS: local-only requests, original UI, patient/photo, Sunday 0, conflicts, manual WhatsApp, notes, archive, persistence, offline block, logout, cross-account activity isolation and late-response isolation.');
  } catch (e) {
    console.error((await page.locator('body').innerText()).slice(-5000));
    throw e;
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

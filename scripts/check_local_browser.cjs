const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.MINA_TEST_CHROMIUM ? { executablePath: process.env.MINA_TEST_CHROMIUM } : {}) });
  const context = await browser.newContext({ timezoneId: 'America/Mexico_City' });
  const page = await context.newPage();
  const errors = [];
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
    assert.deepEqual(errors, []);
    console.log('Browser PASS: original UI, login, patient, private photo, Sunday 0, conflicting devices, manual WhatsApp, notes, archive, persistence, no clinical browser storage, offline block, logout.');
  } catch (e) {
    console.error((await page.locator('body').innerText()).slice(-5000));
    throw e;
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

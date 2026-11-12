const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.MINA_TEST_CHROMIUM ? { executablePath: process.env.MINA_TEST_CHROMIUM } : {}) });
  const context = await browser.newContext({ timezoneId: 'America/Mexico_City' });
  const page = await context.newPage();
  const errors = [];
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
    await page.locator('#patient-reason').fill('Prueba de integración, datos ficticios');
    await page.locator('#patient-privacy-consent').check();
    await page.getByRole('button', { name: 'Guardar paciente', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.locator('#patient-search-input').fill('Navegador');
    assert.equal(await page.locator('.mina-patient-row').count(), 1);
    await page.getByRole('button', { name: /Historial/ }).click();
    await page.locator('#signed-consent-photo').setInputFiles({name:'ficticio.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=','base64')});
    await page.getByRole('checkbox', { name: /Confirmo que la fotografía/ }).check();
    await page.getByRole('button', { name: 'Guardar fotografía privada' }).click();
    await page.getByRole('button', { name: 'Ver fotografía' }).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Expedientes', exact: true }).click();
    await page.locator('#patient-search-input').fill('Navegador');
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
    console.log('Browser PASS: login, original UI, patient, private photo, reload, no clinical browser storage, offline block, logout.');
  } catch (e) {
    console.error((await page.locator('body').innerText()).slice(-5000));
    throw e;
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });

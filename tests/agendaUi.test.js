import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const agenda = readFileSync(new URL('../src/pages/AgendaPage.jsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/layout/Header.jsx', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function assertIconsImported(source) {
  const match = source.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  assert.ok(match, 'No se encontró la importación de lucide-react');
  const imports = new Set(match[1].split(',').map((name) => name.trim()));
  const upperCaseTags = [...source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((m) => m[1]);
  for (const tag of new Set(upperCaseTags)) {
    assert.ok(imports.has(tag), `Falta importar <${tag} /> desde lucide-react`);
  }
}

test('all JSX icons in the agenda and header are imported', () => {
  assertIconsImported(agenda);
  assertIconsImported(header);
});

test('calendar uses a single date heading and the two appointment slots remain available', () => {
  assert.equal((agenda.match(/id="heading-agenda"/g) || []).length, 1);
  assert.ok(agenda.includes('[1, 2].map((slotNum)'));
});

test('HTML shell does not expose static demo clinical records', () => {
  assert.doesNotMatch(html, /María Fernanda López|Carlos Eduardo Ramírez|Fisio Citas/);
  assert.match(html, /id="root"/);
});

test('weekly cards retain patient names, full time, and only exceptional statuses', () => {
  assert.match(agenda, /mina-week-appointment-name/);
  assert.match(agenda, /mina-week-appointment-time/);
  assert.match(agenda, /mina-week-allergy-icon/);
  assert.doesNotMatch(agenda, /'Programada'<\/span>/);
  assert.match(agenda, /weeklyTotalActive === 1/);
});
test('patient duplicate notice and save guidance are kept in the form', () => {
  const patientModal = readFileSync(new URL('../src/components/modals/PatientModal.jsx', import.meta.url), 'utf8');
  assert.match(patientModal, /mina-patient-duplicate-alert/);
  assert.match(patientModal, /mina-patient-save-hint/);
  assert.match(patientModal, /confirmedDifferentPerson/);
});

test('splash draws all MINA paths directly before releasing the app', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const auth = readFileSync(new URL('../src/hooks/useAuth.js', import.meta.url), 'utf8');
  const splash = readFileSync(new URL('../src/components/layout/Splash.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/components/layout/Splash.css', import.meta.url), 'utf8');
  assert.match(app, /<Splash ready=\{startupReady\}/);
  assert.match(app, /patientsLoadedFor === owner/);
  assert.match(app, /appointmentsLoadedFor === owner/);
  assert.match(app, /availabilityLoadedFor === owner/);
  assert.match(auth, /authLoading/);
  assert.equal((splash.match(/d: '/g) || []).length, 8);
  assert.match(splash, /getTotalLength\(\)/);
  assert.match(splash, /requestAnimationFrame\(frame\)/);
  assert.match(splash, /stroke-dashoffset/);
  assert.match(splash, /fill-opacity/);
  assert.match(splash, /ORIGINAL_CYCLE_MS = 6000/);
  assert.match(splash, /LAST_DELAY_MS = 2000/);
  assert.match(splash, /!ready \|\| !drawingDone/);
  assert.doesNotMatch(splash, /<iframe|srcDoc=|matchMedia\(/);
  assert.match(css, /mina-app-revealing/);
});

test('entry transition avoids an unstyled visible skip link and keeps keyboard access', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/components/layout/Splash.css', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /Saltar al contenido/);
  assert.match(app, /mina-skip-link/);
  assert.match(css, /mina-skip-link:focus-visible/);
  assert.match(app, /onRevealStart=\{handleSplashReveal\}/);
});

test('initial clinical data failures block the calendar instead of showing empty slots', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /const loadFailed = startupReady && startupErrors.length > 0/);
  assert.match(app, /\{loadFailed \? \(/);
  assert.match(app, /Por seguridad, la agenda y los expedientes no se muestran/);
  assert.match(app, /Reintentar carga/);
});

test('production without Supabase stops before mounting the clinical app', () => {
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../src/lib/supabase.js', import.meta.url), 'utf8');
  assert.match(client, /import\.meta\.env\.PROD && !isSupabaseConfigured/);
  assert.match(main, /missingProdConfig \?/);
  assert.match(main, /No es seguro guardar expedientes/);
});

test('auth and all three initial loads release errors or timeout timers', () => {
  const auth = readFileSync(new URL('../src/hooks/useAuth.js', import.meta.url), 'utf8');
  const helper = readFileSync(new URL('../src/utils/withTimeout.js', import.meta.url), 'utf8');
  assert.match(auth, /if \(nextSession\) setAuthInitError\(''\)/);
  assert.match(helper, /clearTimeout\(timer\)/);
  for (const name of ['usePatients', 'useAppointments', 'useAvailability']) {
    const source = readFileSync(new URL(`../src/hooks/${name}.js`, import.meta.url), 'utf8');
    assert.match(source, /withTimeout\(fetch/);
    assert.match(source, /\[session\?\.user\?\.id\]/);
  }
});

